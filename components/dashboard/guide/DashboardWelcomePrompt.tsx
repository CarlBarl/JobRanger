'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardWelcomePromptProps {
  open: boolean
  pending: boolean
  onAccept: () => void
  onDismiss: () => void
  title: string
  description: string
  acceptLabel: string
  dismissLabel: string
}

export function DashboardWelcomePrompt({
  open,
  pending,
  onAccept,
  onDismiss,
  title,
  description,
  acceptLabel,
  dismissLabel,
}: DashboardWelcomePromptProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/55 animate-fade-in" />
      <div
        className="relative w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-prompt-title"
        aria-describedby="welcome-prompt-desc"
      >
        {/* Gradient top accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="p-6 sm:p-8">
          {/* Sparkles icon */}
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <h3
            id="welcome-prompt-title"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {title}
          </h3>
          <p
            id="welcome-prompt-desc"
            className="mt-2 text-[15px] leading-relaxed text-muted-foreground"
          >
            {description}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={onDismiss}
            >
              {dismissLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={onAccept}
              className="gap-1.5"
            >
              {acceptLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
