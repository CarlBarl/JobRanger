import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ApiErrorPayload } from '@/lib/api/envelope'
import { isApiEnvelope, isApiFailure } from '@/lib/api/envelope'
import { readGuideFlowState } from '@/lib/guides/flow'

type DocumentRecord = { id: string; type?: string }

type GenerateLetterQuota = {
  limit: number
  used: number
  remaining: number
  resetAt: string
  isExhausted: boolean
}

type JobActionTranslations = (key: string, values?: Record<string, string | number>) => string

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
  error: ApiErrorPayload,
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

export function useJobActions({
  afJobId,
  defaultGuidance,
  existingLettersCount,
  locale,
  t,
}: {
  afJobId: string
  defaultGuidance?: string | null
  existingLettersCount: number
  locale: string
  t: JobActionTranslations
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guidanceOverride, setGuidanceOverride] = useState(defaultGuidance ?? '')
  const [generateLetterQuota, setGenerateLetterQuota] = useState<GenerateLetterQuota | null>(null)
  const [lettersForJobCount, setLettersForJobCount] = useState(existingLettersCount)

  const guideBonusActive = useMemo(() => {
    const guideFlow = readGuideFlowState()
    return Boolean(guideFlow?.active && guideFlow.segment === 'job-detail')
  }, [])

  const generateQuotaExhausted = generateLetterQuota?.isExhausted ?? false
  const generateDisabled = generating || (generateQuotaExhausted && !guideBonusActive)
  const lettersForJobHref = `/letters?jobId=${encodeURIComponent(afJobId)}`

  const resetAtLabel = useMemo(() => {
    if (!generateLetterQuota?.resetAt) return t('actions.quotaResetUnknown')
    return formatResetAtDate(generateLetterQuota.resetAt, locale) ?? t('actions.quotaResetUnknown')
  }, [generateLetterQuota?.resetAt, locale, t])

  useEffect(() => {
    setLettersForJobCount(existingLettersCount)
  }, [existingLettersCount])

  useEffect(() => {
    let cancelled = false

    const loadQuota = async () => {
      try {
        const response = await fetch('/api/user/profile')
        const json: unknown = await response.json()
        if (!isApiEnvelope<unknown>(json) || !json.success) return

        const quota = parseGenerateLetterQuota(json.data)
        if (!cancelled && quota) {
          setGenerateLetterQuota(quota)
        }
      } catch {
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
      if (!isApiEnvelope<unknown>(json)) {
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
    if (generateQuotaExhausted && !guideBonusActive) return

    setGenerating(true)
    setError(null)

    try {
      const docsRes = await fetch('/api/documents')
      const docsJson: unknown = await docsRes.json()
      if (!isApiEnvelope<unknown>(docsJson)) {
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
          guideBonus: guideBonusActive ? true : undefined,
        }),
      })
      const genJson: unknown = await genRes.json()
      if (!isApiEnvelope<unknown>(genJson)) {
        setError(t('actions.failedToGenerate'))
        return
      }
      if (!genJson.success) {
        if (
          isApiFailure(genJson) &&
          genJson.error.code === 'QUOTA_EXCEEDED' &&
          !guideBonusActive
        ) {
          setGenerateLetterQuota((previous) => getQuotaFromError(genJson.error, previous))
          return
        }
        setError(genJson.error.message ?? t('actions.failedToGenerate'))
        return
      }

      setGenerated(true)
      setLettersForJobCount((current) => current + 1)
    } catch {
      setError(t('actions.failedToGenerate'))
    } finally {
      setGenerating(false)
    }
  }, [afJobId, generateQuotaExhausted, guidanceOverride, guideBonusActive, t])

  return {
    saving,
    saved,
    generating,
    generated,
    error,
    guidanceOverride,
    setGuidanceOverride,
    generateLetterQuota,
    generateQuotaExhausted,
    generateDisabled,
    lettersForJobCount,
    lettersForJobHref,
    resetAtLabel,
    handleSave,
    handleGenerate,
  }
}
