'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'upgradeCardDismissedAt'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface DismissibleUpgradeCardProps {
  children: ReactNode
  dismissLabel: string
}

export function DismissibleUpgradeCard({ children, dismissLabel }: DismissibleUpgradeCardProps) {
  const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const dismissedAt = Number(raw)
      if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return // still dismissed
    }
    setDismissed(false)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-transparent">
      {children}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-amber-100/60 hover:text-foreground"
        aria-label={dismissLabel}
      >
        {dismissLabel}
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
