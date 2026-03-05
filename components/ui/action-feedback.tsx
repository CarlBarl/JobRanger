'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ActionFeedback({
  tone,
  message,
  className,
}: {
  tone: 'success' | 'error'
  message: string
  className?: string
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-destructive/20 bg-destructive/5 text-destructive',
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
