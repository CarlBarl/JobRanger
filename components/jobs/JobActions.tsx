'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

type ApiEnvelope =
  | { success: true; data: unknown }
  | {
      success: false
      error: {
        code?: string
        message?: string
        limit?: number
        used?: number
        resetAt?: string
      }
    }

type DocumentRecord = { id: string; type?: string }

type GenerateLetterQuota = {
  limit: number
  used: number
  remaining: number
  resetAt: string
  isExhausted: boolean
}

function isEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

function getDocuments(data: unknown): DocumentRecord[] {
  if (!Array.isArray(data)) return []
  return data as DocumentRecord[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseGenerateLetterQuota(data: unknown): GenerateLetterQuota | null {
  if (!data || typeof data !== 'object') return null
  const quotas = (data as { quotas?: unknown }).quotas
  if (!quotas || typeof quotas !== 'object') return null
  const generateLetter = (quotas as { generateLetter?: unknown }).generateLetter
  if (!generateLetter || typeof generateLetter !== 'object') return null

  const limit = (generateLetter as { limit?: unknown }).limit
  const used = (generateLetter as { used?: unknown }).used
  const remaining = (generateLetter as { remaining?: unknown }).remaining
  const resetAt = (generateLetter as { resetAt?: unknown }).resetAt
  const isExhausted = (generateLetter as { isExhausted?: unknown }).isExhausted

  if (
    !isFiniteNumber(limit) ||
    !isFiniteNumber(used) ||
    !isFiniteNumber(remaining) ||
    typeof resetAt !== 'string' ||
    typeof isExhausted !== 'boolean'
  ) {
    return null
  }

  return { limit, used, remaining, resetAt, isExhausted }
}

function getQuotaFromError(
  error: Extract<ApiEnvelope, { success: false }>['error'],
  fallback: GenerateLetterQuota | null
): GenerateLetterQuota {
  const limit = isFiniteNumber(error.limit) && error.limit > 0 ? error.limit : (fallback?.limit ?? 1)
  const used =
    isFiniteNumber(error.used) && error.used >= 0
      ? error.used
      : Math.max(fallback?.used ?? limit, limit)
  const resetAt =
    typeof error.resetAt === 'string' && error.resetAt.length > 0
      ? error.resetAt
      : (fallback?.resetAt ?? '')

  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    resetAt,
    isExhausted: true,
  }
}

function formatResetAtDate(resetAt: string, locale: string): string | null {
  if (!resetAt) return null
  const parsed = new Date(resetAt)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export function JobActions({
  afJobId,
  defaultGuidance,
}: {
  afJobId: string
  defaultGuidance?: string | null
}) {
  const t = useTranslations('jobs')
  const locale = useLocale()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guidanceOverride, setGuidanceOverride] = useState(defaultGuidance ?? '')
  const [generateLetterQuota, setGenerateLetterQuota] = useState<GenerateLetterQuota | null>(null)

  const generateQuotaExhausted = generateLetterQuota?.isExhausted ?? false
  const generateDisabled = generating || generateQuotaExhausted

  const resetAtLabel = useMemo(() => {
    if (!generateLetterQuota?.resetAt) return t('actions.quotaResetUnknown')
    return formatResetAtDate(generateLetterQuota.resetAt, locale) ?? t('actions.quotaResetUnknown')
  }, [generateLetterQuota?.resetAt, locale, t])

  useEffect(() => {
    let cancelled = false

    const loadQuota = async () => {
      try {
        const response = await fetch('/api/user/profile')
        const json: unknown = await response.json()
        if (!isEnvelope(json) || !json.success) return

        const quota = parseGenerateLetterQuota(json.data)
        if (!cancelled && quota) {
          setGenerateLetterQuota(quota)
        }
      } catch {
        // Best-effort precheck; fallback still handled on /api/generate response.
      }
    }

    void loadQuota()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ afJobId }),
      })
      const json: unknown = await res.json()
      if (!isEnvelope(json)) {
        setError(t('actions.failedToSave'))
        return
      }
      if (!json.success) {
        setError(json.error.message ?? t('actions.failedToSave'))
        return
      }
      setSaved(true)
    } catch {
      setError(t('actions.failedToSave'))
    } finally {
      setSaving(false)
    }
  }, [afJobId, t])

  const handleGenerate = useCallback(async () => {
    if (generateQuotaExhausted) return

    setGenerating(true)
    setError(null)

    try {
      const docsRes = await fetch('/api/documents')
      const docsJson: unknown = await docsRes.json()
      if (!isEnvelope(docsJson)) {
        setError(t('actions.failedToLoadDocuments'))
        return
      }
      if (!docsJson.success) {
        setError(docsJson.error.message ?? t('actions.failedToLoadDocuments'))
        return
      }

      const docs = getDocuments(docsJson.data)
      const cv = docs.find((d) => d.type === 'cv') ?? null
      if (!cv) {
        setError(t('actions.uploadCvFirst'))
        return
      }

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          afJobId,
          documentId: cv.id,
          guidanceOverride: guidanceOverride.trim() || undefined,
        }),
      })
      const genJson: unknown = await genRes.json()
      if (!isEnvelope(genJson)) {
        setError(t('actions.failedToGenerate'))
        return
      }
      if (!genJson.success) {
        if (genJson.error.code === 'QUOTA_EXCEEDED') {
          setGenerateLetterQuota((previous) => getQuotaFromError(genJson.error, previous))
          return
        }
        setError(genJson.error.message ?? t('actions.failedToGenerate'))
        return
      }

      setGenerated(true)
    } catch {
      setError(t('actions.failedToGenerate'))
    } finally {
      setGenerating(false)
    }
  }, [afJobId, generateQuotaExhausted, guidanceOverride, t])

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border bg-muted/20 p-3" data-guide-id="jobs-detail-guidance-input">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t('actions.guidanceLabel')}
        </label>
        <textarea
          value={guidanceOverride}
          onChange={(event) => setGuidanceOverride(event.target.value)}
          placeholder={t('actions.guidancePlaceholder')}
          rows={4}
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          {t('actions.guidanceHelp')}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleSave}
        disabled={saving || saved}
        className="w-full justify-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={saved ? 0 : 1.5}
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
          />
        </svg>
        {saved ? t('actions.saved') : saving ? t('actions.saving') : t('actions.saveJob')}
      </Button>
      {generated ? (
        <div className="rounded-md bg-primary/5 border border-primary/15 px-3 py-2.5 text-center">
          <p className="text-sm font-medium text-foreground">{t('actions.generateSuccess')}</p>
          <Link
            href="/letters"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t('actions.viewLetters')}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerate}
          disabled={generateDisabled}
          data-guide-id="jobs-detail-generate-button"
          className="w-full justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M3 13V3H10L13 6V13H3Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
            <path d="M10 3V6H13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.5 9H10.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <path d="M5.5 11H8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          {generating ? t('actions.generating') : t('actions.generateLetter')}
        </Button>
      )}
      {generateQuotaExhausted ? (
        <div className="rounded-md border border-border bg-muted/35 px-3 py-2 text-xs text-foreground">
          <p className="font-medium">{t('actions.quotaExceededTitle')}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('actions.quotaUsage', {
              used: generateLetterQuota?.used ?? 0,
              limit: generateLetterQuota?.limit ?? 1,
            })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('actions.quotaResetAt', { date: resetAtLabel })}
          </p>
          <Link
            href="/pricing"
            className="mt-2 inline-flex items-center text-[11px] font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('actions.upgradeCta')}
          </Link>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
