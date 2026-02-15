'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LetterGuidanceSettingsProps {
  initialValue: string | null
}

const MAX_GUIDANCE_CHARS = 1200

type ApiEnvelope = {
  success: boolean
  data?: {
    letterGuidanceDefault?: string | null
  }
  error?: {
    message?: string
  }
}

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return !!value && typeof value === 'object' && 'success' in value
}

export function LetterGuidanceSettings({ initialValue }: LetterGuidanceSettingsProps) {
  const t = useTranslations('dashboard.letterGuidance')
  const [value, setValue] = useState(initialValue ?? '')
  const [savedValue, setSavedValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const remaining = MAX_GUIDANCE_CHARS - value.length
  const isDirty = value !== savedValue

  const handleSave = async () => {
    if (saving || !isDirty) return
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterGuidanceDefault: value }),
      })
      const json: unknown = await response.json()

      if (!isApiEnvelope(json) || !json.success) {
        setError(json && typeof json === 'object' && 'error' in json
          ? ((json as ApiEnvelope).error?.message ?? t('saveFailed'))
          : t('saveFailed'))
        return
      }

      const next = json.data?.letterGuidanceDefault ?? ''
      setValue(next)
      setSavedValue(next)
      setSaved(true)
    } catch {
      setError(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="rounded-xl border bg-card p-5"
      data-guide-id="dashboard-letter-guidance"
    >
      <h2 className="text-[13px] font-medium text-foreground/70">
        {t('title')}
      </h2>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        {t('description')}
      </p>

      <textarea
        value={value}
        maxLength={MAX_GUIDANCE_CHARS}
        onChange={(event) => {
          setValue(event.target.value)
          setSaved(false)
        }}
        placeholder={t('placeholder')}
        className="mt-3 min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground/80">
          {t('hint')}
        </p>
        <p className="text-[11px] tabular-nums text-muted-foreground/70">
          {t('remaining', { count: remaining })}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          data-guide-id="dashboard-letter-guidance-save"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
        {saved ? <span className="text-[11px] text-emerald-600">{t('saved')}</span> : null}
        {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
      </div>
    </section>
  )
}
