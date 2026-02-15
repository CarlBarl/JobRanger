'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

import { JobSearch } from '@/components/jobs/JobSearch'

interface JobPreviewStepProps {
  onComplete: (savedCount: number) => void
}

type ApiEnvelope = { success: boolean; data?: unknown }

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

function getSavedJobsCount(data: unknown): number {
  if (!Array.isArray(data)) return 0
  return data.length
}

export function JobPreviewStep({ onComplete }: JobPreviewStepProps) {
  const t = useTranslations('onboarding.jobs')
  const [continuing, setContinuing] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleContinue = useCallback(async () => {
    if (continuing) return
    setContinuing(true)

    try {
      const response = await fetch('/api/jobs/save')
      const json: unknown = await response.json()

      if (isApiEnvelope(json) && json.success) {
        onComplete(getSavedJobsCount(json.data))
        return
      }
    } catch {
      // Fall through
    }

    onComplete(0)
  }, [continuing, onComplete])

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
      {/* Guide */}
      <div className="w-full rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <p className="text-[13px] text-stone-700">
          {t('guide')}
        </p>
      </div>

      {hasSearched ? (
        <div className="w-full sticky top-3 z-10 flex justify-end">
          <button
            onClick={() => void handleContinue()}
            disabled={continuing}
            className="h-11 rounded-xl bg-amber-600 px-8 text-[14px] font-medium text-white transition-all duration-200 hover:bg-amber-500 disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
          >
            {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('continue')}
          </button>
        </div>
      ) : null}

      {/* Live jobs UI */}
      <div className="w-full">
        <JobSearch onFirstSearch={() => setHasSearched(true)} />
      </div>

      {/* Tip */}
      <p className="text-center text-[12px] text-stone-500 leading-relaxed">
        {t('tip')}
      </p>
    </div>
  )
}
