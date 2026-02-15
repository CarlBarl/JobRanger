'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CircleHelp } from 'lucide-react'
import { GuidedTourOverlay } from '@/components/guides/GuidedTourOverlay'
import { GuideReplayMenu } from '@/components/dashboard/guide/GuideReplayMenu'
import { createSegmentGuides } from '@/components/dashboard/guide/segments'
import { useGuideFlowState } from '@/components/dashboard/guide/useGuideFlowState'
import { useGuideReplayActions } from '@/components/dashboard/guide/useGuideReplayActions'
import { START_DASHBOARD_GUIDE_EVENT } from '@/lib/guides/events'

type GuidesApiEnvelope = {
  success: boolean
}

export function GuideReplayControl() {
  const t = useTranslations('dashboard.guide')
  const pathname = usePathname()
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const postGuideAction = useCallback(async (action: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const json: unknown = await response.json().catch(() => null)
      if (!response.ok) return false
      if (!json || typeof json !== 'object') return true

      const envelope = json as GuidesApiEnvelope
      return envelope.success !== false
    } catch {
      return false
    }
  }, [])

  const {
    activeSegment,
    tourOpen,
    startFullGuide,
    resetLocalGuideState,
    handleGuideClose,
  } = useGuideFlowState({
    pathname,
    onNavigateDashboard: () => router.push('/dashboard'),
    onDismissed: () => {
      void postGuideAction('markDashboardGuideDismissed')
    },
    onCompleted: () => {
      void postGuideAction('markDashboardGuideCompleted')
    },
  })

  const { busyAction, handleReplayDashboardGuide, handleReplayOnboardingGuide } = useGuideReplayActions({
    postGuideAction,
    startFullGuide,
    resetLocalGuideState,
    onNavigateOnboardingReplay: () => router.push('/onboarding?replay=true'),
  })

  const segmentGuides = useMemo(() => createSegmentGuides(t), [t])

  const currentGuide =
    activeSegment === 'dashboard' ||
    activeSegment === 'jobs' ||
    activeSegment === 'job-detail'
      ? segmentGuides[activeSegment]
      : []

  const finishLabel = useMemo(() => {
    if (activeSegment === 'dashboard') return t('tour.controls.continueJobs')
    if (activeSegment === 'jobs') return t('tour.controls.continueListing')
    return t('tour.controls.finish')
  }, [activeSegment, t])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(event.target as Node)) return
      setMenuOpen(false)
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    const handleStartDashboardGuide = () => {
      startFullGuide()
    }

    window.addEventListener(START_DASHBOARD_GUIDE_EVENT, handleStartDashboardGuide)
    return () => {
      window.removeEventListener(START_DASHBOARD_GUIDE_EVENT, handleStartDashboardGuide)
    }
  }, [startFullGuide])

  const onReplayDashboard = useCallback(async () => {
    await handleReplayDashboardGuide()
    setMenuOpen(false)
  }, [handleReplayDashboardGuide])

  const onReplayOnboarding = useCallback(async () => {
    await handleReplayOnboardingGuide()
    setMenuOpen(false)
  }, [handleReplayOnboardingGuide])

  return (
    <>
      <div ref={wrapperRef} className="relative" data-guide-id="top-nav-guide-button">
        <button
          type="button"
          aria-label={t('replay.button')}
          title={t('replay.button')}
          onClick={() => setMenuOpen((previous) => !previous)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/75 transition-colors hover:bg-accent hover:text-foreground"
        >
          <CircleHelp className="h-4 w-4" />
        </button>

        <GuideReplayMenu
          open={menuOpen}
          busyAction={busyAction}
          dashboardLabel={t('replay.dashboard')}
          onboardingLabel={t('replay.onboarding')}
          onReplayDashboard={() => void onReplayDashboard()}
          onReplayOnboarding={() => void onReplayOnboarding()}
        />
      </div>

      <GuidedTourOverlay
        open={tourOpen}
        steps={currentGuide}
        labels={{
          step: t('tour.controls.step', { current: '{current}', total: '{total}' }),
          previous: t('tour.controls.previous'),
          next: t('tour.controls.next'),
          finish: finishLabel,
          skip: t('tour.controls.skip'),
        }}
        onClose={handleGuideClose}
      />
    </>
  )
}
