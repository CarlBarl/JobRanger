'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { JOBS_SEARCH_STATE_DEBOUNCE_MS } from '@/components/jobs/search/constants'
import { getUniqueSkills } from '@/components/jobs/search/normalizers'
import {
  isMeaningfulJobsSearchState,
  persistJobsSearchState,
  restoreJobsSearchState,
} from '@/components/jobs/search/persistence'
import { readGuideFlowState } from '@/lib/guides/flow'
import type {
  PersistedJobsSearchState,
  JobsSearchStateController,
  JobsSearchTab,
  ScoredJob,
} from '@/components/jobs/search/types'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'
import { normalizeSkillKey } from '@/lib/skills/normalize'

export function useJobsSearchState(): JobsSearchStateController {
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
  const firstSearchNotifiedRef = useRef(false)
  const latestPersistedStateRef = useRef<PersistedJobsSearchState | null>(null)
  const searchRunIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const jobsMapRef = useRef(new Map<string, ScoredJob>())
  const jobMatchedQuerySkillsRef = useRef(new Map<string, Set<string>>())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedSkillSet = useMemo(
    () => getUniqueSkills(selectedSkills),
    [selectedSkills]
  )
  const allSkillSet = useMemo(() => getUniqueSkills(skills), [skills])

  useEffect(() => {
    const persisted = restoreJobsSearchState()
    if (persisted) {
      restoredStateRef.current = true
      setActiveTab(persisted.tab)
      setQuery(persisted.query)
      setSelectedRegion(persisted.region)
      setSkills(persisted.skills)
      setSelectedSkills(persisted.selectedSkills)
      setSkillsPanelOpen(persisted.skillsPanelOpen)
      setHasSearched(persisted.hasSearched)
      setJobs(persisted.jobs)
      setSearchSkillMatches(persisted.searchSkillMatches)
      setError(persisted.error)
      setCurrentPage(persisted.currentPage)
      setItemsPerPage(persisted.itemsPerPage)
    } else {
      restoredStateRef.current = false
    }

    const guideFlow = readGuideFlowState()
    if (guideFlow?.active && guideFlow.segment === 'jobs') {
      setActiveTab('search')
    }

    const timer = setTimeout(() => {
      restoringRef.current = false
      persistenceEnabledRef.current = true
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const payload = {
      v: 1 as const,
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
      if (!isMeaningfulJobsSearchState(payload)) return
      persistJobsSearchState(payload)
    }
  }, [])

  useEffect(() => {
    if (jobMatchedQuerySkillsRef.current.size === 0) return

    const selectedKeys = new Set(selectedSkillSet.map((skill) => normalizeSkillKey(skill)))
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

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
      }
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    activeTab,
    setActiveTab,
    query,
    setQuery,
    jobs,
    setJobs,
    error,
    setError,
    loading,
    setLoading,
    hasSearched,
    setHasSearched,
    skills,
    setSkills,
    selectedSkills,
    setSelectedSkills,
    skillsLoading,
    setSkillsLoading,
    skillsError,
    setSkillsError,
    savedJobIds,
    setSavedJobIds,
    savedJobs,
    setSavedJobs,
    savedJobsLoading,
    setSavedJobsLoading,
    savedJobsError,
    setSavedJobsError,
    selectedRegion,
    setSelectedRegion,
    searchSkillMatches,
    setSearchSkillMatches,
    skillsPanelOpen,
    setSkillsPanelOpen,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    skillCatalog,
    setSkillCatalog,
    searchPhase,
    setSearchPhase,
    pendingQueries,
    setPendingQueries,
    failedQueries,
    setFailedQueries,
    totalFound,
    setTotalFound,
    selectedSkillSet,
    allSkillSet,
    restoringRef,
    persistenceEnabledRef,
    restoredStateRef,
    firstSearchNotifiedRef,
    latestPersistedStateRef,
    searchRunIdRef,
    abortControllerRef,
    jobsMapRef,
    jobMatchedQuerySkillsRef,
    flushTimerRef,
  }
}
