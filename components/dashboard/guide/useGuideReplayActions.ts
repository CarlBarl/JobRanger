'use client'

import { useCallback, useState } from 'react'
import { clearGuideFlowState } from '@/lib/guides/flow'

type BusyAction = 'dashboard' | 'onboarding' | null

interface UseGuideReplayActionsParams {
  postGuideAction: (action: string) => Promise<boolean>
  startFullGuide: () => void
  onNavigateOnboardingReplay: () => void
  resetLocalGuideState: () => void
}

export function useGuideReplayActions({
  postGuideAction,
  startFullGuide,
  onNavigateOnboardingReplay,
  resetLocalGuideState,
}: UseGuideReplayActionsParams) {
  const [busyAction, setBusyAction] = useState<BusyAction>(null)

  const handleReplayDashboardGuide = useCallback(async () => {
    if (busyAction) return
    setBusyAction('dashboard')

    const persisted = await postGuideAction('restartDashboardGuide')
    setBusyAction(null)
    if (!persisted) return

    startFullGuide()
  }, [busyAction, postGuideAction, startFullGuide])

  const handleReplayOnboardingGuide = useCallback(async () => {
    if (busyAction) return
    setBusyAction('onboarding')

    const persisted = await postGuideAction('restartOnboardingGuide')
    setBusyAction(null)
    if (!persisted) return

    clearGuideFlowState()
    resetLocalGuideState()
    onNavigateOnboardingReplay()
  }, [busyAction, onNavigateOnboardingReplay, postGuideAction, resetLocalGuideState])

  return {
    busyAction,
    handleReplayDashboardGuide,
    handleReplayOnboardingGuide,
  }
}
