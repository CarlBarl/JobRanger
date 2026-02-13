'use client'

import { useTranslations } from 'next-intl'

interface ActiveFiltersProps {
  relevanceEnabled: boolean
  onRelevanceChange: (enabled: boolean) => void
  hasSkills: boolean
}

export function ActiveFilters({
  relevanceEnabled,
  onRelevanceChange,
  hasSkills,
}: ActiveFiltersProps) {
  const t = useTranslations('jobs')
  if (!hasSkills) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={relevanceEnabled}
          onChange={(e) => onRelevanceChange(e.target.checked)}
          className="rounded"
        />
        <span className="text-muted-foreground">{t('relevanceToggle')}</span>
      </label>
    </div>
  )
}
