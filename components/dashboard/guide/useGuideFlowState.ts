'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  clearGuideFlowState,
  type GuideFlowSegment,
  readGuideFlowState,
  writeGuideFlowState,
} from '@/lib/guides/flow'
import { isJobDetailPath } from '@/components/dashboard/guide/segments'
import { JOBS_SEARCH_STATE_KEY } from '@/components/jobs/search/constants'

function getJobIdFromPathname(pathname: string): string | null {
  if (!isJobDetailPath(pathname)) return null
  const prefix = '/jobs/'
  if (!pathname.startsWith(prefix)) return null
  const jobId = pathname.slice(prefix.length)
  return jobId ? jobId : null
}

function forceJobsGuideStartOnSearchTab() {
  try {
    const raw = sessionStorage.getItem(JOBS_SEARCH_STATE_KEY)
    if (!raw) return

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return

    const version = (parsed as { v?: unknown }).v
    if (version !== 1) return

    const tab = (parsed as { tab?: unknown }).tab
    if (tab === 'search') return

    sessionStorage.setItem(JOBS_SEARCH_STATE_KEY, JSON.stringify({ ...(parsed as object), tab: 'search' }))
  } catch {
    // Ignore persistence failures
  }
}

interface UseGuideFlowStateParams {
  pathname: string
  onNavigateDashboard: () => void
  onNavigateJobs: () => void
  onNavigateLetters: (jobId?: string) => void
  onNavigateSettings: () => void
  onDismissed: () => void
  onCompleted: () => void
}

export function useGuideFlowState({
  pathname,
  onNavigateDashboard,
  onNavigateJobs,
  onNavigateLetters,
  onNavigateSettings,
  onDismissed,
  onCompleted,
}: UseGuideFlowStateParams) {
  const [activeSegment, setActiveSegment] = useState<GuideFlowSegment | null>(null)
  const [tourOpen, setTourOpen] = useState(false)

  const startFullGuide = useCallback(() => {
    writeGuideFlowState({ active: true, segment: 'dashboard' })
    setActiveSegment('dashboard')

    if (pathname !== '/dashboard') {
      setTourOpen(false)
      onNavigateDashboard()
      return
    }

    setTourOpen(true)
  }, [onNavigateDashboard, pathname])

  const resetLocalGuideState = useCallback(() => {
    setActiveSegment(null)
    setTourOpen(false)
  }, [])

  const handleGuideClose = useCallback(
    (completed: boolean) => {
      setTourOpen(false)

      if (!activeSegment) return

      if (!completed) {
        clearGuideFlowState()
        setActiveSegment(null)
        onDismissed()
        return
      }

      if (activeSegment === 'dashboard') {
        writeGuideFlowState({ active: true, segment: 'jobs' })
        setActiveSegment('jobs')
        setTourOpen(false)
        forceJobsGuideStartOnSearchTab()
        onNavigateJobs()
        return
      }

      if (activeSegment === 'jobs') {
        writeGuideFlowState({ active: true, segment: 'jobs-await-detail' })
        setActiveSegment('jobs-await-detail')
        return
      }

      if (activeSegment === 'job-detail') {
        const persisted = readGuideFlowState()
        writeGuideFlowState({
          active: true,
          segment: 'letters',
          ...(persisted?.jobId ? { jobId: persisted.jobId } : {}),
        })
        setActiveSegment('letters')
        setTourOpen(false)
        onNavigateLetters(persisted?.jobId)
        return
      }

      if (activeSegment === 'letters') {
        const persisted = readGuideFlowState()
        writeGuideFlowState({
          active: true,
          segment: 'settings',
          ...(persisted?.jobId ? { jobId: persisted.jobId } : {}),
        })
        setActiveSegment('settings')
        setTourOpen(false)
        onNavigateSettings()
        return
      }

      clearGuideFlowState()
      setActiveSegment(null)
      onCompleted()
    },
    [activeSegment, onCompleted, onDismissed, onNavigateJobs, onNavigateLetters, onNavigateSettings]
  )

  useEffect(() => {
    const persisted = readGuideFlowState()
    if (!persisted?.active) {
      resetLocalGuideState()
      return
    }

    if (persisted.segment === 'jobs-await-detail') {
      if (isJobDetailPath(pathname)) {
        const jobId = getJobIdFromPathname(pathname)
        writeGuideFlowState({ active: true, segment: 'job-detail', ...(jobId ? { jobId } : {}) })
        setActiveSegment('job-detail')
        setTourOpen(true)
      } else {
        setActiveSegment('jobs-await-detail')
        setTourOpen(false)
      }
      return
    }

    if (persisted.segment === 'dashboard') {
      setActiveSegment('dashboard')
      setTourOpen(pathname === '/dashboard')
      return
    }

    if (persisted.segment === 'jobs') {
      setActiveSegment('jobs')
      setTourOpen(pathname === '/jobs')
      return
    }

    if (persisted.segment === 'letters') {
      setActiveSegment('letters')
      setTourOpen(pathname === '/letters')
      return
    }

    if (persisted.segment === 'settings') {
      setActiveSegment('settings')
      setTourOpen(pathname === '/settings')
      return
    }

    setActiveSegment('job-detail')
    const isOnDetail = isJobDetailPath(pathname)
    if (isOnDetail) {
      const jobId = getJobIdFromPathname(pathname)
      if (jobId && jobId !== persisted.jobId) {
        writeGuideFlowState({ active: true, segment: 'job-detail', jobId })
      }
    }
    setTourOpen(isOnDetail)
  }, [pathname, resetLocalGuideState])

  return {
    activeSegment,
    setActiveSegment,
    tourOpen,
    setTourOpen,
    startFullGuide,
    resetLocalGuideState,
    handleGuideClose,
  }
}
