import type { AFJobHit } from '@/lib/services/arbetsformedlingen'
import type { ApiEnvelope } from '@/components/jobs/search/types'

interface JobsSearchMessages {
  errorUnexpectedResponse: string
  errorSearchFailed: string
}

export function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

export function getHits(data: unknown): AFJobHit[] {
  if (!data || typeof data !== 'object') return []
  const hits = (data as { hits?: unknown }).hits
  if (!Array.isArray(hits)) return []
  return hits as AFJobHit[]
}

export function getJob(data: unknown): AFJobHit | null {
  if (!data || typeof data !== 'object') return null
  if (typeof (data as { id?: unknown }).id !== 'string') return null
  return data as AFJobHit
}

export async function fetchJobsByQuery(
  queryText: string,
  options: { limit?: number; region?: string; signal?: AbortSignal } | undefined,
  messages: JobsSearchMessages
): Promise<AFJobHit[]> {
  const params = new URLSearchParams()
  params.set('q', queryText)
  params.set('limit', String(options?.limit ?? 100))
  if (options?.region?.trim()) {
    params.set('region', options.region.trim())
  }

  const response = await fetch(`/api/jobs?${params.toString()}`, { signal: options?.signal })
  const json: unknown = await response.json()

  if (!isApiEnvelope(json)) {
    throw new Error(messages.errorUnexpectedResponse)
  }

  if (!json.success) {
    throw new Error(json.error?.message ?? messages.errorSearchFailed)
  }

  return getHits(json.data)
}

export async function fetchJobById(id: string): Promise<AFJobHit | null> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`)
  const json: unknown = await response.json()

  if (!isApiEnvelope(json) || !json.success) {
    return null
  }

  return getJob(json.data)
}
