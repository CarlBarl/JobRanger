'use client'

import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'

interface BatchSkillsButtonProps {
  onTrigger: () => Promise<void>
  loading: boolean
  disabled?: boolean
}

export function BatchSkillsButton({
  onTrigger,
  loading,
  disabled = false
}: BatchSkillsButtonProps) {
  const t = useTranslations()

  const handleClick = async () => {
    if (!loading && !disabled) {
      await onTrigger()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || disabled}
      aria-label={t('dashboard.regenerateAllSkills')}
      aria-busy={loading}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-muted-foreground/60 transition-all duration-200 hover:text-muted-foreground hover:bg-secondary/60 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <RefreshCw
        className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}
      />
      {loading ? t('dashboard.regenerating') : t('dashboard.regenerateAllSkills')}
    </button>
  )
}
