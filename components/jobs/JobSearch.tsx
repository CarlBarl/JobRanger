'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JobCard } from '@/components/jobs/JobCard'
import { scoreJobRelevance } from '@/lib/scoring'
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

type ScoredJob = AFJobHit & { relevance?: { matched: number; total: number; score: number } }

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

  const selectedSkillSet = useMemo(() => getUniqueSkills(selectedSkills), [selectedSkills])
  const allSkillSet = useMemo(() => getUniqueSkills(skills), [skills])

  const skillQuery = useMemo(
    () => selectedSkillSet.filter(Boolean).join(' OR ').trim(),
    [selectedSkillSet]
  )

  const allSkillsQuery = useMemo(
    () => allSkillSet.filter(Boolean).join(' OR ').trim(),
    [allSkillSet]
  )

  const availableRegions = useMemo(() => {
    const regions = jobs
      .map((job) => job.workplace_address?.region)
      .filter((r): r is string => !!r && r.trim().length > 0)
    return Array.from(new Set(regions)).sort()
  }, [jobs])

  const fetchJobsByQuery = useCallback(
    async (queryText: string): Promise<AFJobHit[]> => {
      const res = await fetch(`/api/jobs?q=${encodeURIComponent(queryText)}`)
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

  const runSearch = useCallback(
    async (overrideQuery?: string) => {
      const q = (overrideQuery ?? query).trim()
      if (!q) {
        setError(t('errorNoSearchTerm'))
        return
      }

      setLoading(true)
      setHasSearched(true)
      setError(null)
      setSelectedRegion('')
      setSearchSkillMatches({})

      try {
        setJobs(await fetchJobsByQuery(q))
      } catch (searchError) {
        const message =
          searchError instanceof Error ? searchError.message : t('errorSearchFailed')
        setJobs([])
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [fetchJobsByQuery, query, t]
  )

  const runSkillsSearch = useCallback(
    async (skillsToSearch: string[]) => {
      const normalizedSkills = getUniqueSkills(skillsToSearch)
      if (normalizedSkills.length === 0) {
        setError(t('errorSelectSkill'))
        return
      }

      setLoading(true)
      setHasSearched(true)
      setError(null)
      setSelectedRegion('')

      try {
        const settled = await Promise.allSettled(
          normalizedSkills.map(async (skill) => ({
            skill,
            hits: await fetchJobsByQuery(skill),
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

        const mergedJobs = Array.from(mergedResults.values())
          .sort((left, right) => {
            const matchesDelta = right.skills.size - left.skills.size
            if (matchesDelta !== 0) return matchesDelta
            return sortByDateDesc(
              left.job.publication_date,
              right.job.publication_date
            )
          })
          .map((entry) => entry.job)

        const matchCounts = Object.fromEntries(
          Array.from(mergedResults.entries()).map(([jobId, value]) => [jobId, value.skills.size])
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

  const handleSearch = useCallback(() => {
    void runSearch()
  }, [runSearch])

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

  const handleSkillSearch = useCallback(() => {
    if (!skillQuery) {
      setError(t('errorSelectSkill'))
      return
    }
    setQuery(skillQuery)
    void runSkillsSearch(selectedSkillSet)
  }, [runSkillsSearch, selectedSkillSet, skillQuery, t])

  const handleAllSkillsSearch = useCallback(() => {
    if (!allSkillsQuery) {
      setError(t('errorNoSkills'))
      return
    }
    setQuery(allSkillsQuery)
    void runSkillsSearch(allSkillSet)
  }, [allSkillSet, allSkillsQuery, runSkillsSearch, t])

  const scoredJobs: ScoredJob[] = useMemo(() => {
    let filtered = jobs

    // Apply region filter
    if (selectedRegion) {
      filtered = filtered.filter(
        (job) => job.workplace_address?.region === selectedRegion
      )
    }

    const relevanceSkills = selectedSkillSet.length > 0 ? selectedSkillSet : allSkillSet
    if (!relevanceEnabled || relevanceSkills.length === 0) return filtered

    return [...filtered]
      .map((job) => ({
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
      .sort((a, b) => (b.relevance?.score ?? 0) - (a.relevance?.score ?? 0))
  }, [allSkillSet, jobs, relevanceEnabled, selectedRegion, selectedSkillSet])

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">{t('searchWithSkillsTitle')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('searchWithSkillsDescription')}
          </p>
        </div>

        {skillsLoading ? (
          <p className="text-xs text-muted-foreground">{t('loadingSkills')}</p>
        ) : null}

        {skillsError ? (
          <p className="text-sm text-destructive">{skillsError}</p>
        ) : null}

        {skills.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {t('selectedSkillsCount', {
                  selected: selectedSkillSet.length,
                  total: allSkillSet.length,
                })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllSkills}
                disabled={loading}
              >
                {t('selectAllSkills')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectTopSkills}
                disabled={loading || skills.length === 0}
              >
                {t('selectTopSkills')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSkills}
                disabled={loading || selectedSkills.length === 0}
              >
                {t('deselectAllSkills')}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <label
                  key={skill}
                  className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                    disabled={loading}
                  />
                  <span className="break-all">{skill}</span>
                </label>
              ))}
            </div>
          </div>
        ) : skillsLoading ? null : (
          <p className="text-xs text-muted-foreground">
            {t('noSkillsFound')}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={handleSkillSearch}
            disabled={loading || skills.length === 0}
            className="w-full sm:w-auto"
          >
            {t('searchWithSelectedSkills')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAllSkillsSearch}
            disabled={loading || skills.length === 0}
            className="w-full sm:w-auto"
          >
            {t('searchWithAllSkills')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="jobs-q">{t('search')}</Label>
          <Input
            id="jobs-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSearch()
              }
            }}
            placeholder={t('searchPlaceholder')}
            disabled={loading}
          />
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? t('searching') : t('search')}
        </Button>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={relevanceEnabled}
              onChange={(e) => setRelevanceEnabled(e.target.checked)}
              className="rounded"
            />
            <span>{t('relevanceToggle')}</span>
          </label>
        </div>
      )}

      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium">{t('savedJobsTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('savedJobsDescription')}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {t('savedJobsCount', { count: savedJobIds.size })}
          </span>
        </div>

        {savedJobsLoading ? (
          <p className="text-xs text-muted-foreground">{t('savedJobsLoading')}</p>
        ) : null}

        {savedJobsError ? (
          <p className="text-sm text-destructive">{savedJobsError}</p>
        ) : null}

        {!savedJobsLoading && savedJobs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('savedJobsEmpty')}</p>
        ) : null}

        {savedJobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {savedJobs.map((job) => (
              <JobCard
                key={`saved-${job.id}`}
                job={job}
                isSaved
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        ) : null}
      </div>

      {availableRegions.length > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="region-filter" className="text-sm font-medium">
            {t('regionFilter')}:
          </label>
          <select
            id="region-filter"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm sm:w-auto"
          >
            <option value="">{t('allRegions')}</option>
            {availableRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {hasSearched ? (
        <p className="text-xs text-muted-foreground">
          {t('found', { count: scoredJobs.length })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t('enterSearch')}</p>
      )}

      {hasSearched && !loading && scoredJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noResults')}</p>
      ) : null}

      {scoredJobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {scoredJobs.map((job) => (
            <div key={job.id} className="relative">
              {searchSkillMatches[job.id] ? (
                <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t('skillSearchBadge', { count: searchSkillMatches[job.id] })}
                </span>
              ) : null}
              {job.relevance && job.relevance.matched > 0 && !searchSkillMatches[job.id] ? (
                <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t('relevanceBadge', {
                    matched: job.relevance.matched,
                    total: job.relevance.total,
                  })}
                </span>
              ) : null}
              <JobCard
                job={job}
                isSaved={savedJobIds.has(job.id)}
                onToggleSave={handleToggleSave}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
