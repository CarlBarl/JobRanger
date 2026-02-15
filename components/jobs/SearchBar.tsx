'use client'

import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  region: string
  onRegionChange: (region: string) => void
  onSearch: () => void
  loading: boolean
  selectedSkillCount: number
  totalSkillCount: number
  skillsPanelOpen: boolean
  onToggleSkillsPanel: () => void
}

export function SearchBar({
  query,
  onQueryChange,
  region,
  onRegionChange,
  onSearch,
  loading,
  selectedSkillCount,
  totalSkillCount,
  skillsPanelOpen,
  onToggleSkillsPanel,
}: SearchBarProps) {
  const t = useTranslations('jobs')

  return (
    <div className="space-y-2" data-guide-id="jobs-search-bar">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            id="jobs-q"
            data-guide-id="jobs-search-keywords"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearch()
              }
            }}
            placeholder={t('searchPlaceholderUnified')}
            disabled={loading}
            className="pl-9"
          />
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            id="jobs-region"
            data-guide-id="jobs-search-region"
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearch()
              }
            }}
            placeholder={t('regionPlaceholder')}
            disabled={loading}
            className="pl-9"
          />
        </div>

        <Button
          type="button"
          onClick={onSearch}
          disabled={loading}
          data-guide-id="jobs-search-submit"
          className="shrink-0"
        >
          {loading ? t('searching') : t('search')}
        </Button>
      </div>

      {totalSkillCount > 0 && (
        <button
          type="button"
          onClick={onToggleSkillsPanel}
          data-guide-id="jobs-skills-toggle"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
            'text-muted-foreground transition-colors hover:text-foreground',
            'border border-transparent hover:border-border/50',
            selectedSkillCount > 0 && 'text-primary'
          )}
        >
          {selectedSkillCount > 0
            ? t('skillsToggleCount', { selected: selectedSkillCount, total: totalSkillCount })
            : t('skillsToggle', { total: totalSkillCount })}
          {skillsPanelOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  )
}
