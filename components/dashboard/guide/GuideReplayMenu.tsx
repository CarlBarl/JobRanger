'use client'

import { Loader2 } from 'lucide-react'

type BusyAction = 'dashboard' | 'onboarding' | null

interface GuideReplayMenuProps {
  open: boolean
  busyAction: BusyAction
  dashboardLabel: string
  onboardingLabel: string
  onReplayDashboard: () => void
  onReplayOnboarding: () => void
}

export function GuideReplayMenu({
  open,
  busyAction,
  dashboardLabel,
  onboardingLabel,
  onReplayDashboard,
  onReplayOnboarding,
}: GuideReplayMenuProps) {
  if (!open) return null

  return (
    <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[60] w-64 rounded-lg border border-border/80 bg-card p-2 shadow-xl">
      <button
        type="button"
        onClick={onReplayDashboard}
        disabled={busyAction !== null}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        <span>{dashboardLabel}</span>
        {busyAction === 'dashboard' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </button>
      <button
        type="button"
        onClick={onReplayOnboarding}
        disabled={busyAction !== null}
        className="mt-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        <span>{onboardingLabel}</span>
        {busyAction === 'onboarding' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      </button>
    </div>
  )
}
