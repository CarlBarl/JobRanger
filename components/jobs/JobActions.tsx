'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

type ApiEnvelope =
  | { success: true; data: unknown }
  | { success: false; error: { message?: string } }

type DocumentRecord = { id: string; type?: string }

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

export function JobActions({ afJobId }: { afJobId: string }) {
  const t = useTranslations('jobs')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        body: JSON.stringify({ afJobId, documentId: cv.id }),
      })
      const genJson: unknown = await genRes.json()
      if (!isEnvelope(genJson)) {
        setError(t('actions.failedToGenerate'))
        return
      }
      if (!genJson.success) {
        setError(genJson.error.message ?? t('actions.failedToGenerate'))
        return
      }

      setGenerated(true)
    } catch {
      setError(t('actions.failedToGenerate'))
    } finally {
      setGenerating(false)
    }
  }, [afJobId, t])

  return (
    <div className="flex flex-col gap-2">
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
          disabled={generating}
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
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
