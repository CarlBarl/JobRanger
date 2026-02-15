'use client'

import { useCallback } from 'react'
import { STREAM_FLUSH_DELAY_MS } from '@/components/jobs/search/constants'
import { buildSkillsKey, getUniqueSkills, isAbortError } from '@/components/jobs/search/normalizers'
import { sortStreamedSkillJobs } from '@/components/jobs/search/ranking'
import type {
  JobsSearchStateController,
  JobsTranslations,
  ScoredJob,
} from '@/components/jobs/search/types'
import { normalizeSkillKey } from '@/lib/skills/normalize'
import { scoreJobRelevance } from '@/lib/scoring'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

interface UseSkillsSearchExecutionParams {
  t: JobsTranslations
  controller: JobsSearchStateController
  fetchJobsByQueryWithMessages: (
    queryText: string,
    options?: { limit?: number; region?: string; signal?: AbortSignal }
  ) => Promise<AFJobHit[]>
}

export function useSkillsSearchExecution({
  t,
  controller,
  fetchJobsByQueryWithMessages,
}: UseSkillsSearchExecutionParams) {
  const {
    setError,
    setJobs,
    setSearchSkillMatches,
    setTotalFound,
    setSearchPhase,
    setLoading,
    setHasSearched,
    setCurrentPage,
    setPendingQueries,
    setFailedQueries,
    searchRunIdRef,
    abortControllerRef,
    flushTimerRef,
    jobsMapRef,
    jobMatchedQuerySkillsRef,
  } = controller

  const flushJobsToState = useCallback(() => {
    const currentSkillMatches = Object.fromEntries(
      Array.from(jobMatchedQuerySkillsRef.current.entries()).map(([jobId, matchedSkills]) => [
        jobId,
        matchedSkills.size,
      ])
    )

    const allJobs = sortStreamedSkillJobs(Array.from(jobsMapRef.current.values()), currentSkillMatches)
    setJobs(allJobs)
    setSearchSkillMatches(currentSkillMatches)
    setTotalFound(allJobs.length)
  }, [
    jobMatchedQuerySkillsRef,
    jobsMapRef,
    setJobs,
    setSearchSkillMatches,
    setTotalFound,
  ])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current !== null) return
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null
      flushJobsToState()
    }, STREAM_FLUSH_DELAY_MS)
  }, [flushJobsToState, flushTimerRef])

  return useCallback(
    async (skillsToSearch: string[], textQuery = '', region = '') => {
      const normalizedSkills = getUniqueSkills(skillsToSearch)
      if (normalizedSkills.length === 0) {
        setError(t('errorSelectSkill'))
        return
      }

      abortControllerRef.current?.abort()
      const controllerForRun = new AbortController()
      abortControllerRef.current = controllerForRun
      const runId = ++searchRunIdRef.current

      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }

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
            const hits = await fetchJobsByQueryWithMessages(
              textQuery ? `${skill} ${textQuery}` : skill,
              { region, signal: controllerForRun.signal }
            )

            if (searchRunIdRef.current !== runId) return

            const skillKey = normalizeSkillKey(skill)
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

            scheduleFlush()
          } catch (error) {
            if (searchRunIdRef.current !== runId) return
            if (isAbortError(error)) return
            localFailed++
          } finally {
            if (searchRunIdRef.current === runId) {
              setPendingQueries((previous) => Math.max(0, previous - 1))
            }
          }
        })
      )

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
    [
      abortControllerRef,
      fetchJobsByQueryWithMessages,
      flushJobsToState,
      flushTimerRef,
      jobMatchedQuerySkillsRef,
      jobsMapRef,
      scheduleFlush,
      searchRunIdRef,
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
    ]
  )
}
