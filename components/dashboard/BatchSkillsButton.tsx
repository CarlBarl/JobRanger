'use client'

import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <Button
      onClick={handleClick}
      disabled={loading || disabled}
      aria-label={t('dashboard.regenerateAllSkills')}
      aria-busy={loading}
      variant="outline"
      className="w-full gap-2 sm:w-auto"
    >
      <RefreshCw
        className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
      />
      {loading ? t('dashboard.regenerating') : t('dashboard.regenerateAllSkills')}
    </Button>
  )
}
