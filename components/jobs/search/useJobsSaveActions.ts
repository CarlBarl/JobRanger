'use client'

import { useCallback } from 'react'
import type { JobsSearchStateController, JobsTranslations } from '@/components/jobs/search/types'

interface UseJobsSaveActionsParams {
  controller: JobsSearchStateController
  t: JobsTranslations
}

export function useJobsSaveActions({ controller, t }: UseJobsSaveActionsParams) {
  const {
    jobs,
    savedJobIds,
    savedJobs,
    setSavedJobIds,
    setSavedJobs,
    setError,
  } = controller

  return useCallback(
    async (afJobId: string) => {
      const wasSaved = savedJobIds.has(afJobId)
      const currentSavedJobs = savedJobs
      const candidateJob =
        currentSavedJobs.find((job) => job.id === afJobId) ??
        jobs.find((job) => job.id === afJobId)

      setSavedJobIds((previous) => {
        const next = new Set(previous)
        if (wasSaved) {
          next.delete(afJobId)
        } else {
          next.add(afJobId)
        }
        return next
      })

      if (wasSaved) {
        setSavedJobs((previous) => previous.filter((job) => job.id !== afJobId))
      } else if (candidateJob) {
        setSavedJobs((previous) => [candidateJob, ...previous.filter((job) => job.id !== afJobId)])
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
        setSavedJobIds((previous) => {
          const next = new Set(previous)
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
    },
    [jobs, savedJobIds, savedJobs, setError, setSavedJobIds, setSavedJobs, t]
  )
}
