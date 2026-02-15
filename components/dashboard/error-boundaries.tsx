'use client'

import { useTranslations } from 'next-intl'

interface SectionErrorProps {
  sectionKey: 'stats' | 'documents' | 'skills' | 'recentJobs'
  reset?: () => void
}

export function SectionError({ sectionKey, reset }: SectionErrorProps) {
  const t = useTranslations('dashboard.sectionError')

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
      <p className="text-[13px] text-destructive/70">{t(sectionKey)}</p>
      {reset && (
        <button
          onClick={reset}
          className="mt-2 text-[12px] font-medium text-destructive/60 hover:text-destructive transition-colors"
        >
          {t('retry')}
        </button>
      )}
    </div>
  )
}
