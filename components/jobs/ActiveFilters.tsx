'use client'

import { useTranslations } from 'next-intl'

interface ActiveFiltersProps {
  regions: string[]
  selectedRegion: string
  onRegionChange: (region: string) => void
  relevanceEnabled: boolean
  onRelevanceChange: (enabled: boolean) => void
  hasSkills: boolean
}

export function ActiveFilters({
  regions,
  selectedRegion,
  onRegionChange,
  relevanceEnabled,
  onRelevanceChange,
  hasSkills,
}: ActiveFiltersProps) {
  const t = useTranslations('jobs')

  const showRegion = regions.length > 1
  const showRelevance = hasSkills

  if (!showRegion && !showRelevance) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showRegion && (
        <div className="flex items-center gap-2">
          <label htmlFor="region-filter" className="text-xs font-medium text-muted-foreground">
            {t('regionFilter')}:
          </label>
          <select
            id="region-filter"
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="rounded-md border bg-background px-2.5 py-1 text-xs"
          >
            <option value="">{t('allRegions')}</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      )}

      {showRelevance && (
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={relevanceEnabled}
            onChange={(e) => onRelevanceChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-muted-foreground">{t('relevanceToggle')}</span>
        </label>
      )}
    </div>
  )
}
