'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { UserTier } from '@/generated/prisma/client'

interface DashboardNameEditorProps {
  userName: string | null
  userEmail: string
  userTier: UserTier
}

export function DashboardNameEditor({ userName, userEmail, userTier }: DashboardNameEditorProps) {
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = name.trim().length >= 2

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        router.refresh()
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
      handleSave()
    }
  }

  const proBadge = userTier === 'PRO' ? (
    <span className="inline-flex rounded-full border border-primary/30 bg-primary/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      PRO
    </span>
  ) : null

  if (userName) {
    return (
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
          <span>{userName}</span>
          {proBadge}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground/60">{userEmail}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('namePlaceholder')}
            disabled={saving}
            autoFocus
            className="h-9 w-48 rounded-lg border border-border/60 bg-card/80 px-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-200"
          />
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="h-9 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? t('savingName') : t('saveName')}
          </button>
        </div>
        {proBadge}
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground/60">{userEmail}</p>
    </div>
  )
}
