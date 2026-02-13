import { isValidAfJobId } from '@/lib/security/sanitize'

const AF_BASE_URL = 'https://jobsearch.api.jobtechdev.se'

type WorkplaceAddress = {
  municipality?: string | null
  region?: string | null
  country?: string | null
  city?: string | null
  street_address?: string | null
  postcode?: string | null
} | null

export type AFJobHit = {
  id: string
  webpage_url?: string | null
  headline?: string
  employer?: { name?: string | null } | null
  workplace_address?: WorkplaceAddress
  description?: { text?: string | null; text_formatted?: string | null } | null
  publication_date?: string | null
  application_deadline?: string | null
  logo_url?: string | null
  employment_type?: { label?: string | null } | null
  working_hours_type?: { label?: string | null } | null
  occupation?: { label?: string | null } | null
}

export type AFSearchResponse = {
  total: { value: number }
  hits: AFJobHit[]
}

export type AFJobAd = {
  id: string
  webpage_url?: string | null
  headline?: string
  employer?: { name?: string | null } | null
  description?: { text?: string | null; text_formatted?: string | null } | null
  workplace_address?: WorkplaceAddress
  publication_date?: string | null
  application_deadline?: string | null
  logo_url?: string | null
  employment_type?: { label?: string | null } | null
  working_hours_type?: { label?: string | null } | null
  occupation?: { label?: string | null } | null
  application_details?: { url?: string | null } | null
} & Record<string, unknown>

export type SearchJobsOptions = {
  query: string
  region?: string
  limit?: number
  offset?: number
}

function buildSearchQuery(query: string, region?: string): string {
  const trimmedQuery = query.trim()
  const trimmedRegion = region?.trim()
  if (!trimmedRegion) return trimmedQuery
  if (!trimmedQuery) return trimmedRegion

  const normalizedQuery = trimmedQuery
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const normalizedRegion = trimmedRegion
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalizedQuery.includes(normalizedRegion)) {
    return trimmedQuery
  }

  return `${trimmedQuery} ${trimmedRegion}`
}

function getApiKeyHeader(): Record<string, string> {
  const apiKey = process.env.AF_API_KEY
  return apiKey ? { 'api-key': apiKey } : {}
}

export async function searchJobs(options: SearchJobsOptions): Promise<AFSearchResponse> {
  const params = new URLSearchParams()
  params.set('q', buildSearchQuery(options.query, options.region))
  params.set('limit', String(options.limit ?? 20))
  params.set('offset', String(options.offset ?? 0))

  const response = await fetch(`${AF_BASE_URL}/search?${params.toString()}`, {
    headers: {
      accept: 'application/json',
      ...getApiKeyHeader(),
    },
  })

  if (!response.ok) {
    throw new Error(`AF API error: ${response.status}`)
  }

  return (await response.json()) as AFSearchResponse
}

export async function getJobById(id: string): Promise<AFJobAd> {
  if (!isValidAfJobId(id)) {
    throw new Error('Invalid AF job ID format')
  }

  const response = await fetch(`${AF_BASE_URL}/ad/${id}`, {
    headers: {
      accept: 'application/json',
      ...getApiKeyHeader(),
    },
  })

  if (!response.ok) {
    throw new Error(`AF API error: ${response.status}`)
  }

  return (await response.json()) as AFJobAd
}
