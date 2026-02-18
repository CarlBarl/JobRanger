'use client'

import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DismissibleProWelcomeCardProps {
  children: ReactNode
  dismissLabel: string
  initialDismissed: boolean
}

export function DismissibleProWelcomeCard({
  children,
  dismissLabel,
  initialDismissed,
}: DismissibleProWelcomeCardProps) {
  const [dismissed, setDismissed] = useState(initialDismissed)

  const handleDismiss = async () => {
    setDismissed(true)
    try {
      await fetch('/api/user/guides', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'markProOnboardingDismissed' }),
      })
    } catch {
      // Ignore network failures; local UI state still hides the card.
    }
  }

  if (dismissed) return null

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-transparent">
      {children}
      <button
        type="button"
        onClick={() => void handleDismiss()}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-emerald-100/60 hover:text-foreground"
        aria-label={dismissLabel}
      >
        {dismissLabel}
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
