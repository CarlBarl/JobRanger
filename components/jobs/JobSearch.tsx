'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JobCard } from '@/components/jobs/JobCard'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

type ApiError = { code?: string; message?: string }
type ApiEnvelope = { success: boolean; data?: unknown; error?: ApiError }

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

function getHits(data: unknown): AFJobHit[] {
  if (!data || typeof data !== 'object') return []
  const hits = (data as { hits?: unknown }).hits
  if (!Array.isArray(hits)) return []
  return hits as AFJobHit[]
}

export function JobSearch() {
  const [query, setQuery] = useState('')
  const [jobs, setJobs] = useState<AFJobHit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setError('Please enter a search term')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/jobs?q=${encodeURIComponent(q)}`)
      const json: unknown = await res.json()

      if (!isApiEnvelope(json)) {
        setJobs([])
        setError('Unexpected response from server')
        return
      }

      if (!json.success) {
        setJobs([])
        setError(json.error?.message ?? 'Search failed')
        return
      }

      setJobs(getHits(json.data))
    } catch {
      setJobs([])
      setError('Search failed')
    } finally {
      setLoading(false)
    }
  }, [query])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="jobs-q">Search</Label>
          <Input
            id="jobs-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. developer"
            disabled={loading}
          />
        </div>
        <Button type="button" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

