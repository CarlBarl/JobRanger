'use client'

import { useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'

interface GuideCompletionToastProps {
  open: boolean
  title: string
  description: string
  onClose: () => void
  durationMs?: number
}

export function GuideCompletionToast({
  open,
  title,
  description,
  onClose,
  durationMs = 4500,
}: GuideCompletionToastProps) {
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => onClose(), durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-x-0 bottom-6 z-[85] flex justify-center px-4 pointer-events-none animate-fade-up">
      <div className="pointer-events-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-card shadow-xl">
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded p-2 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

