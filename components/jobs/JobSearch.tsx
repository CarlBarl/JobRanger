'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchBar } from '@/components/jobs/SearchBar'
import { SkillSelector } from '@/components/jobs/SkillSelector'
import { SearchResults } from '@/components/jobs/SearchResults'
import { SearchStatusBar } from '@/components/jobs/SearchStatusBar'
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
  relevanceSkillsKey?: string
}

type JobsSearchTab = 'search' | 'saved'

type PersistedJobsSearchState = {
  v: 1
  tab: JobsSearchTab
  query: string
  region: string
  skills: string[]
  selectedSkills: string[]
  skillsPanelOpen: boolean
  hasSearched: boolean
  jobs: ScoredJob[]
  searchSkillMatches: Record<string, number>
  error: string | null
  currentPage: number
  itemsPerPage: number
}

const JOBS_SEARCH_STATE_KEY = 'jobranger:jobsSearchState:v1'
const JOBS_SEARCH_STATE_DEBOUNCE_MS = 250
const JOBS_SEARCH_STATE_MAX_CHARS = 1_500_000

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asTab(value: unknown): JobsSearchTab {
  return value === 'saved' ? 'saved' : 'search'
}

function asSearchSkillMatches(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number'
  )
  return Object.fromEntries(entries)
}

function asJobs(value: unknown): ScoredJob[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (candidate): candidate is ScoredJob =>
      !!candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as { id?: unknown }).id === 'string'
  )
}

function reconcileSelectedSkills(selected: string[], available: string[]): string[] {
  if (selected.length === 0 || available.length === 0) return []
  const availableByKey = new Map(
    available.map((skill) => [skill.trim().toLowerCase(), skill] as const)
  )
  const reconciled = selected
    .map((skill) => availableByKey.get(skill.trim().toLowerCase()) ?? null)
    .filter((skill): skill is string => typeof skill === 'string')
  return getUniqueSkills(reconciled)
}

function persistJobsSearchState(payload: PersistedJobsSearchState) {
  try {
    const serialized = JSON.stringify(payload)
    if (serialized.length > JOBS_SEARCH_STATE_MAX_CHARS) {
      const compact = JSON.stringify({ ...payload, jobs: [] })
      sessionStorage.setItem(JOBS_SEARCH_STATE_KEY, compact)
      return
    }
    sessionStorage.setItem(JOBS_SEARCH_STATE_KEY, serialized)
  } catch {
    // Ignore persistence errors
  }
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

function buildSkillsKey(skills: string[]): string {
  return skills
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('\n')
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
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
const STREAM_FLUSH_DELAY_MS = 150

export function JobSearch() {
  const t = useTranslations('jobs')
  const [activeTab, setActiveTab] = useState<JobsSearchTab>('search')
  const [query, setQuery] = useState('')
  const [jobs, setJobs] = useState<ScoredJob[]>([])
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
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [searchSkillMatches, setSearchSkillMatches] = useState<Record<string, number>>({})
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [skillCatalog, setSkillCatalog] = useState<string[] | null>(null)
  const [searchPhase, setSearchPhase] = useState<'idle' | 'searching' | 'complete'>('idle')
  const [pendingQueries, setPendingQueries] = useState(0)
  const [failedQueries, setFailedQueries] = useState(0)
  const [totalFound, setTotalFound] = useState(0)
  const restoringRef = useRef(true)
  const persistenceEnabledRef = useRef(false)
  const restoredStateRef = useRef(false)
  const latestPersistedStateRef = useRef<PersistedJobsSearchState | null>(null)
  const searchRunIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const jobsMapRef = useRef(new Map<string, ScoredJob>())
  const jobMatchedQuerySkillsRef = useRef(new Map<string, Set<string>>())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedSkillSet = useMemo(() => getUniqueSkills(selectedSkills), [selectedSkills])
  const allSkillSet = useMemo(() => getUniqueSkills(skills), [skills])

  useEffect(() => {
    let didRestore = false

    try {
      const raw = sessionStorage.getItem(JOBS_SEARCH_STATE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && (parsed as { v?: unknown }).v === 1) {
          const persisted = parsed as Partial<PersistedJobsSearchState>
          const hasMeaningfulState =
            persisted.tab === 'saved' ||
            typeof persisted.query === 'string' ||
            typeof persisted.region === 'string' ||
            Array.isArray(persisted.selectedSkills) ||
            Array.isArray(persisted.jobs)

          if (hasMeaningfulState) {
            didRestore = true
            setActiveTab(asTab(persisted.tab))
            setQuery(asString(persisted.query))
            setSelectedRegion(asString(persisted.region))
            setSkills(asStringArray(persisted.skills))
            setSelectedSkills(asStringArray(persisted.selectedSkills))
            setSkillsPanelOpen(asBoolean(persisted.skillsPanelOpen, false))
            setHasSearched(asBoolean(persisted.hasSearched, false))
            setJobs(asJobs(persisted.jobs))
            setSearchSkillMatches(asSearchSkillMatches(persisted.searchSkillMatches))
            setError(typeof persisted.error === 'string' ? persisted.error : null)
            setCurrentPage(asNumber(persisted.currentPage, 1))
            setItemsPerPage(asNumber(persisted.itemsPerPage, 20))
          }
        }
      }
    } catch {
      // Ignore persistence errors
    }

    restoredStateRef.current = didRestore
    const timer = setTimeout(() => {
      restoringRef.current = false
      persistenceEnabledRef.current = true
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const payload: PersistedJobsSearchState = {
      v: 1,
      tab: activeTab,
      query,
      region: selectedRegion,
      skills,
      selectedSkills,
      skillsPanelOpen,
      hasSearched,
      jobs,
      searchSkillMatches,
      error,
      currentPage,
      itemsPerPage,
    }
    latestPersistedStateRef.current = payload

    if (!persistenceEnabledRef.current) return

    const timer = setTimeout(() => {
      persistJobsSearchState(payload)
    }, JOBS_SEARCH_STATE_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [
    activeTab,
    currentPage,
    error,
    hasSearched,
    itemsPerPage,
    jobs,
    query,
    searchSkillMatches,
    selectedRegion,
    selectedSkills,
    skills,
    skillsPanelOpen,
  ])

  useEffect(() => {
    return () => {
      if (restoringRef.current) return
      const payload = latestPersistedStateRef.current
      if (!payload) return
      const isMeaningful =
        payload.tab === 'saved' ||
        payload.hasSearched ||
        payload.jobs.length > 0 ||
        payload.query.trim().length > 0 ||
        payload.region.trim().length > 0
      if (!isMeaningful) return
      persistJobsSearchState(payload)
    }
  }, [])

  useEffect(() => {
    if (jobMatchedQuerySkillsRef.current.size === 0) return

    const selectedKeys = new Set(selectedSkillSet.map((skill) => skill.trim().toLowerCase()))
    const next = Object.fromEntries(
      Array.from(jobMatchedQuerySkillsRef.current.entries())
        .map(([jobId, matchedSkills]) => {
          let count = 0
          for (const skillKey of matchedSkills) {
            if (selectedKeys.has(skillKey)) {
              count += 1
            }
          }
          return [jobId, count] as const
        })
        .filter(([, count]) => count > 0)
    )

    setSearchSkillMatches(next)
  }, [selectedSkillSet])

  const fetchJobsByQuery = useCallback(
    async (
      queryText: string,
      options?: { limit?: number; region?: string; signal?: AbortSignal }
    ): Promise<AFJobHit[]> => {
      const params = new URLSearchParams()
      params.set('q', queryText)
      params.set('limit', String(options?.limit ?? 100))
      if (options?.region?.trim()) {
        params.set('region', options.region.trim())
      }

      const res = await fetch(`/api/jobs?${params.toString()}`, { signal: options?.signal })
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

  const flushJobsToState = useCallback(() => {
    const currentSkillMatches = Object.fromEntries(
      Array.from(jobMatchedQuerySkillsRef.current.entries()).map(([jobId, matchedSkills]) => [
        jobId,
        matchedSkills.size,
      ])
    )
    const allJobs = Array.from(jobsMapRef.current.values())
    // Stable sort: query skill coverage -> score -> date -> id
    allJobs.sort((a, b) => {
      const coverageA = currentSkillMatches[a.id] ?? 0
      const coverageB = currentSkillMatches[b.id] ?? 0
      if (coverageB !== coverageA) return coverageB - coverageA

      const scoreA = a.relevance?.matched ?? 0
      const scoreB = b.relevance?.matched ?? 0
      if (scoreB !== scoreA) return scoreB - scoreA
      const dateA = Date.parse(a.publication_date ?? '') || 0
      const dateB = Date.parse(b.publication_date ?? '') || 0
      if (dateB !== dateA) return dateB - dateA
      return a.id.localeCompare(b.id)
    })
    setJobs(allJobs)
    setSearchSkillMatches(currentSkillMatches)
    setTotalFound(allJobs.length)
  }, [])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current !== null) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      flushJobsToState()
    }, STREAM_FLUSH_DELAY_MS)
  }, [flushJobsToState])

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
            if (!restoredStateRef.current) {
              setSkills([])
              setSelectedSkills([])
              setSkillsError(t('skillsErrorUnexpected'))
            }
          }
          return
        }

        if (!json.success) {
          if (active) {
            if (!restoredStateRef.current) {
              setSkills([])
              setSelectedSkills([])
              setSkillsError(json.error?.message ?? t('skillsErrorFailed'))
            }
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
          setSelectedSkills((current) => {
            if (!restoredStateRef.current) return normalizedSkills
            return reconcileSelectedSkills(current, normalizedSkills)
          })
        }
      } catch {
        if (active) {
          if (!restoredStateRef.current) {
            setSkills([])
            setSelectedSkills([])
            setSkillsError(t('skillsErrorFailed'))
          }
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

  // Load skill catalog for job skill extraction
  useEffect(() => {
    let active = true

    const loadCatalog = async () => {
      try {
        const res = await fetch('/api/skills/catalog')
        const json: unknown = await res.json()

        if (
          active &&
          json &&
          typeof json === 'object' &&
          'success' in json &&
          (json as { success: boolean }).success &&
          'data' in json &&
          Array.isArray((json as { data: unknown }).data)
        ) {
          setSkillCatalog((json as { data: string[] }).data)
        }
      } catch {
        // Silent failure — extractJobSkills uses default catalog
      }
    }

    void loadCatalog()

    return () => {
      active = false
    }
  }, [])

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

      // Cancel previous search
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      const runId = ++searchRunIdRef.current

      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }

      // Reset state
      jobsMapRef.current = new Map()
      jobMatchedQuerySkillsRef.current = new Map()
      setJobs([])
      setSearchPhase('searching')
      setLoading(true)
      setHasSearched(true)
      setError(null)
      setCurrentPage(1)
      setPendingQueries(normalizedSkills.length)
      setFailedQueries(0)
      setTotalFound(0)
      setSearchSkillMatches({})

      let localFailed = 0
      const relevanceSkillsKey = buildSkillsKey(normalizedSkills)

      await Promise.allSettled(
        normalizedSkills.map(async (skill) => {
          try {
            const hits = await fetchJobsByQuery(
              textQuery ? `${skill} ${textQuery}` : skill,
              { region, signal: controller.signal }
            )

            // Guard: ignore if stale search
            if (searchRunIdRef.current !== runId) return

            // Score and merge into map (score once)
            const skillKey = skill.toLowerCase()
            for (const hit of hits) {
              const skillSet = jobMatchedQuerySkillsRef.current.get(hit.id) ?? new Set<string>()
              skillSet.add(skillKey)
              jobMatchedQuerySkillsRef.current.set(hit.id, skillSet)

              if (!jobsMapRef.current.has(hit.id)) {
                const relevance = scoreJobRelevance(
                  {
                    headline: hit.headline,
                    description: hit.description?.text,
                    occupation: hit.occupation?.label,
                  },
                  normalizedSkills
                )
                const scoredJob: ScoredJob = { ...hit, relevance, relevanceSkillsKey }
                jobsMapRef.current.set(hit.id, scoredJob)
              }
            }

            // Schedule batched UI update
            scheduleFlush()
          } catch (error) {
            if (searchRunIdRef.current !== runId) return
            if (isAbortError(error)) return
            localFailed++
          } finally {
            if (searchRunIdRef.current === runId) {
              setPendingQueries((prev) => Math.max(0, prev - 1))
            }
          }
        })
      )

      // Final flush
      if (searchRunIdRef.current !== runId) return
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
      flushJobsToState()

      setFailedQueries(localFailed)
      setSearchPhase('complete')
      setLoading(false)

      if (localFailed > 0 && jobsMapRef.current.size > 0) {
        setError(t('skillSearchPartialFailure', { count: localFailed }))
      } else if (jobsMapRef.current.size === 0) {
        setError(t('errorSearchFailed'))
      }
    },
    [fetchJobsByQuery, flushJobsToState, scheduleFlush, t]
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

    // Skills selected WITHOUT text query → per-skill parallel search (skill discovery)
    if (hasSelectedSkills && !hasQuery) {
      void runSkillsSearch(selectedSkillSet, '', trimmedRegion)
      return
    }

    // Text search (with or without skills)
    const queryForFetch = hasQuery ? trimmedQuery : trimmedRegion
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const runId = ++searchRunIdRef.current
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }

    setLoading(true)
    setHasSearched(true)
    setError(null)
    setSearchSkillMatches({})
    setCurrentPage(1)
    setSearchPhase('searching')
    setTotalFound(0)
    setFailedQueries(0)
    setPendingQueries(0)
    jobMatchedQuerySkillsRef.current = new Map()

    void fetchJobsByQuery(queryForFetch, { region: trimmedRegion, signal: controller.signal })
      .then((results) => {
        if (searchRunIdRef.current !== runId) return
        setJobs(results)
        setTotalFound(results.length)
        setSearchPhase('complete')
      })
      .catch((searchError) => {
        if (searchRunIdRef.current !== runId || isAbortError(searchError)) return
        const message =
          searchError instanceof Error ? searchError.message : t('errorSearchFailed')
        setJobs([])
        setError(message)
        setTotalFound(0)
        setSearchPhase('complete')
      })
      .finally(() => {
        if (searchRunIdRef.current !== runId) return
        setLoading(false)
      })
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
    const relevanceSkills = selectedSkillSet
    const hasRelevanceSkills = relevanceSkills.length > 0
    const relevanceSkillsKey = hasRelevanceSkills ? buildSkillsKey(relevanceSkills) : ''

    const withRelevance: ScoredJob[] = jobs.map((job) => {
      if (!hasRelevanceSkills) {
        if (!job.relevance && !job.relevanceSkillsKey) return job
        return { ...job, relevance: undefined, relevanceSkillsKey: undefined }
      }

      if (job.relevance && job.relevanceSkillsKey === relevanceSkillsKey) return job

      return {
        ...job,
        relevance: scoreJobRelevance(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          relevanceSkills
        ),
        relevanceSkillsKey,
      }
    })

    const getSearchSkillMatchCount = (job: ScoredJob): number => {
      const skillSearchMatches = searchSkillMatches[job.id]
      if (typeof skillSearchMatches === 'number' && skillSearchMatches > 0) {
        return skillSearchMatches
      }
      return 0
    }

    const getRelevanceMatchCount = (job: ScoredJob): number =>
      hasRelevanceSkills ? job.relevance?.matched ?? 0 : 0

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

        const dateDelta = sortByDateDesc(a.publication_date, b.publication_date)
        if (dateDelta !== 0) return dateDelta

        return a.id.localeCompare(b.id)
      })
  }, [
    jobs,
    query,
    searchSkillMatches,
    selectedRegion,
    selectedSkillSet,
  ])

  const extractedSkillsByJob = useMemo(() => {
    return Object.fromEntries(
      jobs.map((job) => [
        job.id,
        extractJobSkills(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          skillCatalog?.length ? skillCatalog : undefined
        ),
      ])
    )
  }, [jobs, skillCatalog])

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
    if (restoringRef.current) return
    setCurrentPage(1)
  }, [itemsPerPage, selectedRegion, selectedSkillSet])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(scoredJobs.length / itemsPerPage))
    setCurrentPage((prev) => Math.min(prev, maxPage))
  }, [scoredJobs.length, itemsPerPage])

  // Cleanup flush timer and abort controller on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
      }
      abortControllerRef.current?.abort()
    }
  }, [])

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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(asTab(value))}>
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

          <SearchStatusBar
            phase={searchPhase}
            totalFound={totalFound}
            pendingQueries={pendingQueries}
            failedQueries={failedQueries}
          />

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
            paginationLocked={searchPhase === 'searching'}
            pagination={{
              currentPage,
              totalPages,
              totalItems: scoredJobs.length,
              itemsPerPage,
              onPageChange: searchPhase !== 'searching' ? setCurrentPage : () => {},
              onItemsPerPageChange: searchPhase !== 'searching' ? setItemsPerPage : () => {},
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
