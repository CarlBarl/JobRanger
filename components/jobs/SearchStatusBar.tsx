'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

interface SearchStatusBarProps {
  phase: 'idle' | 'searching' | 'complete'
  totalFound: number
  failedQueries: number
}

export function SearchStatusBar({
  phase,
  totalFound,
  failedQueries,
}: SearchStatusBarProps) {
  const t = useTranslations('jobs.searchStatus')

  if (phase === 'idle') return null

  const isSearching = phase === 'searching'

  let message: string
  if (isSearching) {
    message =
      totalFound > 0
        ? t('searchingFound', { count: totalFound })
        : t('searching')
  } else {
    if (totalFound === 0) {
      message = t('noResults')
    } else if (failedQueries > 0) {
      message = t('completeWithFailures', {
        count: totalFound,
        failed: failedQueries,
      })
    } else {
      message = t('complete', { count: totalFound })
    }
  }

  return (
    <div className="animate-in fade-in duration-300 flex items-center gap-2 py-2">
      {isSearching && (
        <Loader2
          data-testid="search-status-spinner"
          className="h-3.5 w-3.5 animate-spin text-primary"
        />
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {message}
      </span>
    </div>
  )
}
