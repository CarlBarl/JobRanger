'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { DashboardWelcomePrompt } from '@/components/dashboard/guide/DashboardWelcomePrompt'
import { START_DASHBOARD_GUIDE_EVENT } from '@/lib/guides/events'

export interface DashboardGuideState {
  dashboardGuidePromptedAt: string | null
  dashboardGuideCompletedAt: string | null
  dashboardGuideDismissedAt: string | null
}

interface DashboardGuideControllerProps {
  initialState: DashboardGuideState
}

type GuidesApiEnvelope = {
  success: boolean
  data?: DashboardGuideState
}

export function DashboardGuideController({ initialState }: DashboardGuideControllerProps) {
  const t = useTranslations('dashboard.guide')
  const [guideState, setGuideState] = useState(initialState)
  const [promptOpen, setPromptOpen] = useState(
    !initialState.dashboardGuidePromptedAt && !initialState.dashboardGuideCompletedAt
  )
  const [pendingPromptAction, setPendingPromptAction] = useState(false)

  const postGuideAction = useCallback(async (action: string) => {
    try {
      const response = await fetch('/api/user/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const json: unknown = await response.json()
      if (!json || typeof json !== 'object') return

      const envelope = json as GuidesApiEnvelope
      if (envelope.success && envelope.data) {
        setGuideState(envelope.data)
      }
    } catch {
      // Keep UI responsive even if persistence fails
    }
  }, [])

  const startTourFromPrompt = useCallback(async () => {
    setPendingPromptAction(true)
    await postGuideAction('markDashboardPromptShown')
    setPromptOpen(false)
    window.dispatchEvent(new Event(START_DASHBOARD_GUIDE_EVENT))
    setPendingPromptAction(false)
  }, [postGuideAction])

  const dismissPrompt = useCallback(async () => {
    setPendingPromptAction(true)
    await postGuideAction('markDashboardGuideDismissed')
    setPromptOpen(false)
    setPendingPromptAction(false)
  }, [postGuideAction])

  const promptShouldRender =
    promptOpen && !guideState.dashboardGuideCompletedAt

  return (
    <>
      <DashboardWelcomePrompt
        open={promptShouldRender}
        pending={pendingPromptAction}
        onAccept={() => void startTourFromPrompt()}
        onDismiss={() => void dismissPrompt()}
        title={t('prompt.title')}
        description={t('prompt.description')}
        acceptLabel={t('prompt.accept')}
        dismissLabel={t('prompt.dismiss')}
      />
    </>
  )
}
