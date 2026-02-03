'use client'

import { useCallback, useState } from 'react'
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [letterId, setLetterId] = useState<string | null>(null)
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
        setError('Failed to save')
        return
      }
      if (!json.success) {
        setError(json.error.message ?? 'Failed to save')
        return
      }
      setSaved(true)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }, [afJobId])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    setLetterId(null)

    try {
      const docsRes = await fetch('/api/documents')
      const docsJson: unknown = await docsRes.json()
      if (!isEnvelope(docsJson)) {
        setError('Failed to load documents')
        return
      }
      if (!docsJson.success) {
        setError(docsJson.error.message ?? 'Failed to load documents')
        return
      }

      const docs = getDocuments(docsJson.data)
      const cv = docs.find((d) => d.type === 'cv') ?? null
      if (!cv) {
        setError('Upload a CV first')
        return
      }

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ afJobId, documentId: cv.id }),
      })
      const genJson: unknown = await genRes.json()
      if (!isEnvelope(genJson)) {
        setError('Failed to generate letter')
        return
      }
      if (!genJson.success) {
        setError(genJson.error.message ?? 'Failed to generate letter')
        return
      }

      const id = (genJson.data as { id?: unknown }).id
      setLetterId(typeof id === 'string' ? id : 'unknown')
    } catch {
      setError('Failed to generate letter')
    } finally {
      setGenerating(false)
    }
  }, [afJobId])

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button type="button" variant="outline" onClick={handleSave} disabled={saving || saved}>
        {saved ? 'Saved' : saving ? 'Saving...' : 'Save job'}
      </Button>
      <Button type="button" onClick={handleGenerate} disabled={generating}>
        {generating ? 'Generating...' : 'Generate letter'}
      </Button>
      {letterId ? (
        <span className="text-sm text-muted-foreground">Generated: {letterId}</span>
      ) : null}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  )
}
