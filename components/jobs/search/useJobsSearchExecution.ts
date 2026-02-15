'use client'

import { useCallback } from 'react'
import { fetchJobsByQuery } from '@/components/jobs/search/fetchers'
import { useSkillsSearchExecution } from '@/components/jobs/search/useSkillsSearchExecution'
import { useUnifiedSearchExecution } from '@/components/jobs/search/useUnifiedSearchExecution'
import type { JobsSearchStateController, JobsTranslations } from '@/components/jobs/search/types'

interface UseJobsSearchExecutionParams {
  t: JobsTranslations
  onFirstSearch?: () => void
  controller: JobsSearchStateController
}

export function useJobsSearchExecution({
  t,
  onFirstSearch,
  controller,
}: UseJobsSearchExecutionParams) {
  const fetchJobsByQueryWithMessages = useCallback(
    (queryText: string, options?: { limit?: number; region?: string; signal?: AbortSignal }) =>
      fetchJobsByQuery(queryText, options, {
        errorUnexpectedResponse: t('errorUnexpectedResponse'),
        errorSearchFailed: t('errorSearchFailed'),
      }),
    [t]
  )

  const runSkillsSearch = useSkillsSearchExecution({
    t,
    controller,
    fetchJobsByQueryWithMessages,
  })

  const handleUnifiedSearch = useUnifiedSearchExecution({
    t,
    onFirstSearch,
    controller,
    runSkillsSearch,
    fetchJobsByQueryWithMessages,
  })

  return { handleUnifiedSearch }
}
