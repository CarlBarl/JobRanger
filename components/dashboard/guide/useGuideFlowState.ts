'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  clearGuideFlowState,
  type GuideFlowSegment,
  readGuideFlowState,
  writeGuideFlowState,
} from '@/lib/guides/flow'
import { isJobDetailPath } from '@/components/dashboard/guide/segments'

interface UseGuideFlowStateParams {
  pathname: string
  onNavigateDashboard: () => void
  onDismissed: () => void
  onCompleted: () => void
}

export function useGuideFlowState({
  pathname,
  onNavigateDashboard,
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
        return
      }

      if (activeSegment === 'jobs') {
        writeGuideFlowState({ active: true, segment: 'jobs-await-detail' })
        setActiveSegment('jobs-await-detail')
        return
      }

      clearGuideFlowState()
      setActiveSegment(null)
      onCompleted()
    },
    [activeSegment, onCompleted, onDismissed]
  )

  useEffect(() => {
    const persisted = readGuideFlowState()
    if (!persisted?.active) {
      resetLocalGuideState()
      return
    }

    if (persisted.segment === 'jobs-await-detail') {
      if (isJobDetailPath(pathname)) {
        writeGuideFlowState({ active: true, segment: 'job-detail' })
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

    setActiveSegment('job-detail')
    setTourOpen(isJobDetailPath(pathname))
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
