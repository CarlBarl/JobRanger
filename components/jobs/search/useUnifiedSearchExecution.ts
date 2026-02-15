'use client'

import { useCallback } from 'react'
import { isAbortError } from '@/components/jobs/search/normalizers'
import type { JobsSearchStateController, JobsTranslations } from '@/components/jobs/search/types'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

interface UseUnifiedSearchExecutionParams {
  t: JobsTranslations
  onFirstSearch?: () => void
  controller: JobsSearchStateController
  runSkillsSearch: (skillsToSearch: string[], textQuery?: string, region?: string) => Promise<void>
  fetchJobsByQueryWithMessages: (
    queryText: string,
    options?: { limit?: number; region?: string; signal?: AbortSignal }
  ) => Promise<AFJobHit[]>
}

export function useUnifiedSearchExecution({
  t,
  onFirstSearch,
  controller,
  runSkillsSearch,
  fetchJobsByQueryWithMessages,
}: UseUnifiedSearchExecutionParams) {
  const {
    query,
    selectedRegion,
    selectedSkillSet,
    setError,
    setJobs,
    setTotalFound,
    setSearchPhase,
    setLoading,
    setHasSearched,
    setCurrentPage,
    setPendingQueries,
    setFailedQueries,
    setSearchSkillMatches,
    firstSearchNotifiedRef,
    searchRunIdRef,
    abortControllerRef,
    flushTimerRef,
    jobMatchedQuerySkillsRef,
  } = controller

  return useCallback(() => {
    const trimmedQuery = query.trim()
    const trimmedRegion = selectedRegion.trim()
    const hasQuery = trimmedQuery.length > 0
    const hasRegion = trimmedRegion.length > 0
    const hasSelectedSkills = selectedSkillSet.length > 0

    if (!hasQuery && !hasSelectedSkills && !hasRegion) {
      setError(t('errorNoSearchTerm'))
      return
    }

    if (!firstSearchNotifiedRef.current) {
      firstSearchNotifiedRef.current = true
      onFirstSearch?.()
    }

    if (hasSelectedSkills && !hasQuery) {
      void runSkillsSearch(selectedSkillSet, '', trimmedRegion)
      return
    }

    const queryForFetch = hasQuery ? trimmedQuery : trimmedRegion
    abortControllerRef.current?.abort()
    const controllerForRun = new AbortController()
    abortControllerRef.current = controllerForRun
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

    void fetchJobsByQueryWithMessages(queryForFetch, {
      region: trimmedRegion,
      signal: controllerForRun.signal,
    })
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
  }, [
    abortControllerRef,
    fetchJobsByQueryWithMessages,
    firstSearchNotifiedRef,
    flushTimerRef,
    jobMatchedQuerySkillsRef,
    onFirstSearch,
    query,
    runSkillsSearch,
    searchRunIdRef,
    selectedRegion,
    selectedSkillSet,
    setCurrentPage,
    setError,
    setFailedQueries,
    setHasSearched,
    setJobs,
    setLoading,
    setPendingQueries,
    setSearchPhase,
    setSearchSkillMatches,
    setTotalFound,
    t,
  ])
}
