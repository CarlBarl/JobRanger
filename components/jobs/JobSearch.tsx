'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchBar } from '@/components/jobs/SearchBar'
import { SkillSelector } from '@/components/jobs/SkillSelector'
import { ActiveFilters } from '@/components/jobs/ActiveFilters'
import { SearchResults } from '@/components/jobs/SearchResults'
import { SavedJobsPanel } from '@/components/jobs/SavedJobsPanel'
import { extractJobSkills, scoreJobRelevance } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

type ApiError = { code?: string; message?: string }
type ApiEnvelope = { success: boolean; data?: unknown; error?: ApiError }
type DocumentRecord = {
  type?: string | null
  skills?: unknown
}
type SavedJobRecord = {
  afJobId?: string
}

type ScoredJob = AFJobHit & {
  relevance?: { matched: number; total: number; score: number; matchedSkills: string[] }
}

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

function getHits(data: unknown): AFJobHit[] {
  if (!data || typeof data !== 'object') return []
  const hits = (data as { hits?: unknown }).hits
  if (!Array.isArray(hits)) return []
  return hits as AFJobHit[]
}

function getJob(data: unknown): AFJobHit | null {
  if (!data || typeof data !== 'object') return null
  if (typeof (data as { id?: unknown }).id !== 'string') return null
  return data as AFJobHit
}

function getUniqueSkills(values: string[]): string[] {
  const unique = new Map<string, string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (!unique.has(key)) {
      unique.set(key, trimmed)
    }
  }
  return Array.from(unique.values())
}

function sortByDateDesc(left?: string | null, right?: string | null): number {
  const leftDate = Date.parse(left ?? '')
  const rightDate = Date.parse(right ?? '')
  const safeLeft = Number.isNaN(leftDate) ? 0 : leftDate
  const safeRight = Number.isNaN(rightDate) ? 0 : rightDate
  return safeRight - safeLeft
}

function textRelevanceBonus(job: AFJobHit, queryLower: string): number {
  if (!queryLower) return 0
  let bonus = 0
  if (job.headline?.toLowerCase().includes(queryLower)) bonus += 3
  if (job.employer?.name?.toLowerCase().includes(queryLower)) bonus += 2
  if (job.description?.text?.toLowerCase().includes(queryLower)) bonus += 1
  return bonus
}

function normalizeRegion(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesRegionFilter(jobRegion: string | null | undefined, selectedRegion: string): boolean {
  const normalizedSelected = normalizeRegion(selectedRegion)
  if (!normalizedSelected) return true

  const normalizedJobRegion = normalizeRegion(jobRegion ?? '')
  if (!normalizedJobRegion) return false

  return (
    normalizedJobRegion === normalizedSelected ||
    normalizedJobRegion.includes(normalizedSelected) ||
    normalizedSelected.includes(normalizedJobRegion)
  )
}

function matchesLocationHint(job: AFJobHit, selectedRegion: string): boolean {
  const selected = selectedRegion.trim()
  if (!selected) return false

  const address = job.workplace_address
  const candidates = [
    address?.region,
    address?.municipality,
    address?.city,
    address?.country,
  ]

  return candidates.some((value) => matchesRegionFilter(value, selected))
}

const MAX_VISIBLE_CHIPS = 5

export function JobSearch() {
  const t = useTranslations('jobs')
  const [query, setQuery] = useState('')
  const [jobs, setJobs] = useState<AFJobHit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [savedJobs, setSavedJobs] = useState<AFJobHit[]>([])
  const [savedJobsLoading, setSavedJobsLoading] = useState(false)
  const [savedJobsError, setSavedJobsError] = useState<string | null>(null)
  const [relevanceEnabled, setRelevanceEnabled] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [searchSkillMatches, setSearchSkillMatches] = useState<Record<string, number>>({})
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const selectedSkillSet = useMemo(() => getUniqueSkills(selectedSkills), [selectedSkills])
  const allSkillSet = useMemo(() => getUniqueSkills(skills), [skills])

  const fetchJobsByQuery = useCallback(
    async (
      queryText: string,
      options?: { limit?: number; region?: string }
    ): Promise<AFJobHit[]> => {
      const params = new URLSearchParams()
      params.set('q', queryText)
      params.set('limit', String(options?.limit ?? 100))
      if (options?.region?.trim()) {
        params.set('region', options.region.trim())
      }

      const res = await fetch(`/api/jobs?${params.toString()}`)
      const json: unknown = await res.json()

      if (!isApiEnvelope(json)) {
        throw new Error(t('errorUnexpectedResponse'))
      }

      if (!json.success) {
        throw new Error(json.error?.message ?? t('errorSearchFailed'))
      }

      return getHits(json.data)
    },
    [t]
  )

  const fetchJobById = useCallback(async (id: string): Promise<AFJobHit | null> => {
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`)
    const json: unknown = await res.json()

    if (!isApiEnvelope(json) || !json.success) {
      return null
    }

    return getJob(json.data)
  }, [])

  // Load skills from user's CV
  useEffect(() => {
    let active = true

    const loadSkills = async () => {
      setSkillsLoading(true)
      setSkillsError(null)

      try {
        const res = await fetch('/api/documents')
        const json: unknown = await res.json()

        if (!isApiEnvelope(json)) {
          if (active) {
            setSkills([])
            setSelectedSkills([])
            setSkillsError(t('skillsErrorUnexpected'))
          }
          return
        }

        if (!json.success) {
          if (active) {
            setSkills([])
            setSelectedSkills([])
            setSkillsError(json.error?.message ?? t('skillsErrorFailed'))
          }
          return
        }

        const docs = Array.isArray(json.data) ? (json.data as DocumentRecord[]) : []
        const cvDocWithSkills = docs.find(
          (doc) => doc.type === 'cv' && Array.isArray(doc.skills)
        )
        const rawSkills = Array.isArray(cvDocWithSkills?.skills)
          ? (cvDocWithSkills?.skills as unknown[])
          : []
        const normalizedSkills = Array.from(
          new Set(
            rawSkills
              .filter((skill): skill is string => typeof skill === 'string')
              .map((skill) => skill.trim())
              .filter(Boolean)
          )
        )

        if (active) {
          setSkills(normalizedSkills)
          setSelectedSkills(normalizedSkills)
        }
      } catch {
        if (active) {
          setSkills([])
          setSelectedSkills([])
          setSkillsError(t('skillsErrorFailed'))
        }
      } finally {
        if (active) {
          setSkillsLoading(false)
        }
      }
    }

    void loadSkills()

    return () => {
      active = false
    }
  }, [t])

  // Load saved jobs
  useEffect(() => {
    let active = true

    const loadSavedJobs = async () => {
      setSavedJobsLoading(true)
      setSavedJobsError(null)

      try {
        const res = await fetch('/api/jobs/save')
        const json: unknown = await res.json()

        if (!isApiEnvelope(json) || !json.success || !Array.isArray(json.data)) {
          if (active) {
            setSavedJobs([])
            setSavedJobIds(new Set())
            setSavedJobsError(t('savedJobsLoadFailed'))
          }
          return
        }

        const orderedIds = (json.data as SavedJobRecord[])
          .map((record) => record.afJobId?.trim() ?? '')
          .filter((id): id is string => id.length > 0)
        const uniqueOrderedIds = Array.from(new Set(orderedIds))

        if (!active) return
        setSavedJobIds(new Set(uniqueOrderedIds))

        if (uniqueOrderedIds.length === 0) {
          setSavedJobs([])
          return
        }

        const settled = await Promise.allSettled(
          uniqueOrderedIds.map((id) => fetchJobById(id))
        )

        if (!active) return

        const loadedJobs = settled
          .filter((result): result is PromiseFulfilledResult<AFJobHit | null> => result.status === 'fulfilled')
          .map((result) => result.value)
          .filter((job): job is AFJobHit => !!job)

        setSavedJobs(loadedJobs)

        if (loadedJobs.length !== uniqueOrderedIds.length) {
          setSavedJobsError(t('savedJobsSomeUnavailable'))
        }
      } catch {
        if (active) {
          setSavedJobsError(t('savedJobsLoadFailed'))
          setSavedJobs([])
          setSavedJobIds(new Set())
        }
      } finally {
        if (active) {
          setSavedJobsLoading(false)
        }
      }
    }

    void loadSavedJobs()

    return () => {
      active = false
    }
  }, [fetchJobById, t])

  const handleToggleSave = useCallback(async (afJobId: string) => {
    const wasSaved = savedJobIds.has(afJobId)
    const currentSavedJobs = savedJobs
    const candidateJob = currentSavedJobs.find((job) => job.id === afJobId) ??
      jobs.find((job) => job.id === afJobId)

    // Optimistic update
    setSavedJobIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) {
        next.delete(afJobId)
      } else {
        next.add(afJobId)
      }
      return next
    })

    if (wasSaved) {
      setSavedJobs((prev) => prev.filter((job) => job.id !== afJobId))
    } else if (candidateJob) {
      setSavedJobs((prev) => [candidateJob, ...prev.filter((job) => job.id !== afJobId)])
    }

    try {
      if (wasSaved) {
        const response = await fetch(`/api/jobs/save/${afJobId}`, { method: 'DELETE' })
        if (!response.ok) {
          throw new Error('Failed to remove saved job')
        }
      } else {
        const response = await fetch('/api/jobs/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ afJobId }),
        })
        if (!response.ok) {
          throw new Error('Failed to save job')
        }
      }
    } catch {
      // Revert optimistic update on failure
      setSavedJobIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) {
          next.add(afJobId)
        } else {
          next.delete(afJobId)
        }
        return next
      })
      setSavedJobs(currentSavedJobs)
      setError(t('actions.failedToSave'))
    }
  }, [jobs, savedJobIds, savedJobs, t])

  const runSkillsSearch = useCallback(
    async (skillsToSearch: string[], textQuery = '', region = '') => {
      const normalizedSkills = getUniqueSkills(skillsToSearch)
      if (normalizedSkills.length === 0) {
        setError(t('errorSelectSkill'))
        return
      }

      setLoading(true)
      setHasSearched(true)
      setError(null)
      setCurrentPage(1)

      try {
        const settled = await Promise.allSettled(
          normalizedSkills.map(async (skill) => ({
            skill,
            hits: await fetchJobsByQuery(
              textQuery ? `${skill} ${textQuery}` : skill,
              { region }
            ),
          }))
        )

        const successfulSearches = settled.filter(
          (result): result is PromiseFulfilledResult<{ skill: string; hits: AFJobHit[] }> =>
            result.status === 'fulfilled'
        )

        if (successfulSearches.length === 0) {
          setJobs([])
          setSearchSkillMatches({})
          setError(t('errorSearchFailed'))
          return
        }

        const mergedResults = new Map<string, { job: AFJobHit; skills: Set<string> }>()
        for (const result of successfulSearches) {
          for (const hit of result.value.hits) {
            const existing = mergedResults.get(hit.id)
            if (existing) {
              existing.skills.add(result.value.skill)
            } else {
              mergedResults.set(hit.id, {
                job: hit,
                skills: new Set([result.value.skill]),
              })
            }
          }
        }

        const queryLower = textQuery.toLowerCase()

        const rankedResults = Array.from(mergedResults.values())
          .map((entry) => {
            const relevance = scoreJobRelevance(
              {
                headline: entry.job.headline,
                description: entry.job.description?.text,
                occupation: entry.job.occupation?.label,
              },
              normalizedSkills
            )

            return {
              ...entry,
              relevance,
            }
          })
          .sort((left, right) => {
            const localMatchDelta = right.relevance.matched - left.relevance.matched
            if (localMatchDelta !== 0) return localMatchDelta

            const queryCoverageDelta = right.skills.size - left.skills.size
            if (queryCoverageDelta !== 0) return queryCoverageDelta

            if (textQuery) {
              const leftScore = textRelevanceBonus(left.job, queryLower)
              const rightScore = textRelevanceBonus(right.job, queryLower)
              if (rightScore !== leftScore) return rightScore - leftScore
            }

            return sortByDateDesc(left.job.publication_date, right.job.publication_date)
          })

        const mergedJobs = rankedResults.map((entry) => entry.job)

        const matchCounts = Object.fromEntries(
          rankedResults.map((entry) => [entry.job.id, entry.relevance.matched])
        )

        setJobs(mergedJobs)
        setSearchSkillMatches(matchCounts)

        const failedSearches = settled.length - successfulSearches.length
        if (failedSearches > 0) {
          setError(t('skillSearchPartialFailure', { count: failedSearches }))
        }
      } catch {
        setJobs([])
        setSearchSkillMatches({})
        setError(t('errorSearchFailed'))
      } finally {
        setLoading(false)
      }
    },
    [fetchJobsByQuery, t]
  )

  // Unified search: uses skills if selected, text query as fallback/addition
  const handleUnifiedSearch = useCallback(() => {
    const trimmedQuery = query.trim()
    const trimmedRegion = selectedRegion.trim()
    const hasQuery = trimmedQuery.length > 0
    const hasRegion = trimmedRegion.length > 0
    const hasSelectedSkills = selectedSkillSet.length > 0

    if (!hasQuery && !hasSelectedSkills && !hasRegion) {
      setError(t('errorNoSearchTerm'))
      return
    }

    // If skills are selected, do per-skill parallel search (text narrows results)
    if (hasSelectedSkills) {
      void runSkillsSearch(selectedSkillSet, trimmedQuery, trimmedRegion)
      return
    }

    // Text-only search
    const queryForFetch = hasQuery ? trimmedQuery : trimmedRegion

    setLoading(true)
    setHasSearched(true)
    setError(null)
    setSearchSkillMatches({})
    setCurrentPage(1)

    void fetchJobsByQuery(queryForFetch, { region: trimmedRegion })
      .then((results) => setJobs(results))
      .catch((searchError) => {
        const message =
          searchError instanceof Error ? searchError.message : t('errorSearchFailed')
        setJobs([])
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [fetchJobsByQuery, query, runSkillsSearch, selectedRegion, selectedSkillSet, t])

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill]
    )
  }, [])

  const handleSelectAllSkills = useCallback(() => {
    setSelectedSkills(skills)
  }, [skills])

  const handleClearSkills = useCallback(() => {
    setSelectedSkills([])
  }, [])

  const handleSelectTopSkills = useCallback(() => {
    setSelectedSkills(skills.slice(0, 5))
  }, [skills])

  const scoredJobs: ScoredJob[] = useMemo(() => {
    const queryLower = query.trim().toLowerCase()
    const relevanceSkills = selectedSkillSet.length > 0 ? selectedSkillSet : allSkillSet
    const shouldApplyRelevance = relevanceEnabled && relevanceSkills.length > 0
    const withRelevance: ScoredJob[] = shouldApplyRelevance
      ? jobs.map((job) => ({
          ...job,
          relevance: scoreJobRelevance(
            {
              headline: job.headline,
              description: job.description?.text,
              occupation: job.occupation?.label,
            },
            relevanceSkills
          ),
        }))
      : jobs

    const getSearchSkillMatchCount = (job: ScoredJob): number => {
      const skillSearchMatches = searchSkillMatches[job.id]
      if (typeof skillSearchMatches === 'number' && skillSearchMatches > 0) {
        return skillSearchMatches
      }
      return 0
    }

    const getRelevanceMatchCount = (job: ScoredJob): number =>
      shouldApplyRelevance ? job.relevance?.matched ?? 0 : 0

    return [...withRelevance]
      .sort((a, b) => {
        const skillMatchDelta =
          getSearchSkillMatchCount(b) - getSearchSkillMatchCount(a)
        if (skillMatchDelta !== 0) return skillMatchDelta

        const relevanceMatchDelta =
          getRelevanceMatchCount(b) - getRelevanceMatchCount(a)
        if (relevanceMatchDelta !== 0) return relevanceMatchDelta

        const locationHintDelta =
          Number(matchesLocationHint(b, selectedRegion)) -
          Number(matchesLocationHint(a, selectedRegion))
        if (locationHintDelta !== 0) return locationHintDelta

        const textMatchDelta =
          textRelevanceBonus(b, queryLower) - textRelevanceBonus(a, queryLower)
        if (textMatchDelta !== 0) return textMatchDelta

        return sortByDateDesc(a.publication_date, b.publication_date)
      })
  }, [
    allSkillSet,
    jobs,
    query,
    relevanceEnabled,
    searchSkillMatches,
    selectedRegion,
    selectedSkillSet,
  ])

  const extractedSkillsByJob = useMemo(() => {
    return Object.fromEntries(
      jobs.map((job) => [
        job.id,
        extractJobSkills({
          headline: job.headline,
          description: job.description?.text,
          occupation: job.occupation?.label,
        }),
      ])
    )
  }, [jobs])

  const matchedSkillsByJob = useMemo(() => {
    const selectedKeys = new Set(selectedSkillSet.map((skill) => skill.trim().toLowerCase()))

    return Object.fromEntries(
      Object.entries(extractedSkillsByJob).map(([jobId, extractedSkills]) => [
        jobId,
        extractedSkills.filter((skill) => selectedKeys.has(skill.trim().toLowerCase())),
      ])
    )
  }, [extractedSkillsByJob, selectedSkillSet])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage, relevanceEnabled, selectedRegion, selectedSkillSet])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(scoredJobs.length / itemsPerPage))
    setCurrentPage((prev) => Math.min(prev, maxPage))
  }, [scoredJobs.length, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(scoredJobs.length / itemsPerPage))
  const paginatedJobs = scoredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Compact chip summary of selected skills (shown below search bar)
  const selectedChipSummary = useMemo(() => {
    if (selectedSkillSet.length === 0) return null
    const visible = selectedSkillSet.slice(0, MAX_VISIBLE_CHIPS)
    const remaining = selectedSkillSet.length - visible.length
    return { visible, remaining }
  }, [selectedSkillSet])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="search">
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1">
            {t('tabSearch')}
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1">
            {t('tabSaved', { count: savedJobIds.size })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-3">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            region={selectedRegion}
            onRegionChange={setSelectedRegion}
            onSearch={handleUnifiedSearch}
            loading={loading}
            selectedSkillCount={selectedSkillSet.length}
            totalSkillCount={allSkillSet.length}
            skillsPanelOpen={skillsPanelOpen}
            onToggleSkillsPanel={() => setSkillsPanelOpen((prev) => !prev)}
          />

          {/* Compact selected skill chips (always visible when skills are selected) */}
          {selectedChipSummary && !skillsPanelOpen && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedChipSummary.visible.map((skill) => (
                <span
                  key={skill}
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5',
                    'border border-primary/30 bg-primary/10 text-[11px] font-medium text-primary'
                  )}
                >
                  {skill}
                </span>
              ))}
              {selectedChipSummary.remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setSkillsPanelOpen(true)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {t('moreSkills', { count: selectedChipSummary.remaining })}
                </button>
              )}
            </div>
          )}

          <SkillSelector
            skills={skills}
            selectedSkills={selectedSkills}
            onToggleSkill={toggleSkill}
            onSelectAll={handleSelectAllSkills}
            onSelectTop={handleSelectTopSkills}
            onClearAll={handleClearSkills}
            loading={loading}
            isOpen={skillsPanelOpen}
            skillsLoading={skillsLoading}
            skillsError={skillsError}
          />

          {hasSearched && (
            <ActiveFilters
              relevanceEnabled={relevanceEnabled}
              onRelevanceChange={setRelevanceEnabled}
              hasSkills={skills.length > 0}
            />
          )}

          <SearchResults
            jobs={paginatedJobs}
            hasSearched={hasSearched}
            loading={loading}
            searchSkillMatches={searchSkillMatches}
            jobSkillsByJob={extractedSkillsByJob}
            matchedSkillsByJob={matchedSkillsByJob}
            savedJobIds={savedJobIds}
            onToggleSave={handleToggleSave}
            error={error}
            pagination={{
              currentPage,
              totalPages,
              totalItems: scoredJobs.length,
              itemsPerPage,
              onPageChange: setCurrentPage,
              onItemsPerPageChange: setItemsPerPage,
            }}
          />
        </TabsContent>

        <TabsContent value="saved">
          <SavedJobsPanel
            savedJobs={savedJobs}
            loading={savedJobsLoading}
            error={savedJobsError}
            onToggleSave={handleToggleSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
