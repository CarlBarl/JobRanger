'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SkillSelectorProps {
  skills: string[]
  selectedSkills: string[]
  onToggleSkill: (skill: string) => void
  onSelectAll: () => void
  onSelectTop: () => void
  onClearAll: () => void
  loading: boolean
  isOpen: boolean
  skillsLoading: boolean
  skillsError: string | null
}

export function SkillSelector({
  skills,
  selectedSkills,
  onToggleSkill,
  onSelectAll,
  onSelectTop,
  onClearAll,
  loading,
  isOpen,
  skillsLoading,
  skillsError,
}: SkillSelectorProps) {
  const t = useTranslations('jobs')

  if (skillsLoading) {
    return (
      <p className="px-1 text-xs text-muted-foreground">{t('loadingSkills')}</p>
    )
  }

  if (skillsError) {
    return <p className="px-1 text-sm text-destructive">{skillsError}</p>
  }

  if (skills.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">{t('noSkillsFound')}</p>
    )
  }

  if (!isOpen) return null

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3" data-guide-id="jobs-skill-selector">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          disabled={loading}
          className="h-7 px-2 text-xs"
        >
          {t('selectAllSkills')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSelectTop}
          disabled={loading || skills.length === 0}
          className="h-7 px-2 text-xs"
        >
          {t('selectTopSkills')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          disabled={loading || selectedSkills.length === 0}
          className="h-7 px-2 text-xs"
        >
          {t('clearAll')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const isSelected = selectedSkills.includes(skill)
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggleSkill(skill)}
              disabled={loading}
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5',
                'text-[11px] font-medium transition-all duration-150',
                isSelected
                  ? 'border border-primary/30 bg-primary/10 text-primary'
                  : 'border border-border/60 bg-secondary/80 text-muted-foreground hover:bg-secondary',
                loading && 'opacity-50'
              )}
            >
              {skill}
            </button>
          )
        })}
      </div>
    </div>
  )
}
