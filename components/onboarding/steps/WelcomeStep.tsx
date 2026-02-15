'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface WelcomeStepProps {
  initialName: string | null
  onComplete: (name: string) => void
}

export function WelcomeStep({ initialName, onComplete }: WelcomeStepProps) {
  const t = useTranslations('onboarding.welcome')
  const [name, setName] = useState(initialName || '')
  const [saving, setSaving] = useState(false)

  const canContinue = name.trim().length >= 2

  const handleSubmit = async () => {
    if (!canContinue || saving) return
    setSaving(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (response.ok) {
        onComplete(name.trim())
      }
    } catch {
      // Allow retry
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full max-w-sm">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('namePlaceholder')}
          autoFocus
          disabled={saving}
          className="h-12 w-full rounded-xl border border-stone-300/60 bg-white px-4 text-[15px] text-stone-800 placeholder:text-stone-400 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all duration-200 shadow-sm"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canContinue || saving}
        className="h-11 rounded-xl bg-amber-600 px-8 text-[14px] font-medium text-white transition-all duration-200 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {saving ? t('saving') : t('continue')}
      </button>
    </div>
  )
}
