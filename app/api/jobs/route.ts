import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchJobs } from '@/lib/services/arbetsformedlingen'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

const JobsSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  region: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      },
      { status: 401 }
    )
  }

  const searchLimit = await consumeRateLimit('jobs-search-user', user.id, 120, 60 * 60 * 1000)
  if (!searchLimit.allowed) {
    return rateLimitResponse('Search rate limit exceeded.', searchLimit.retryAfterSeconds)
  }

  const { searchParams } = new URL(request.url)
  const parsed = JobsSearchQuerySchema.safeParse({
    q: searchParams.get('q') ?? '',
    region: searchParams.get('region')?.trim() || undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid query parameters' },
      },
      { status: 400 }
    )
  }

  const data = await searchJobs({
    query: parsed.data.q,
    region: parsed.data.region,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  })

  return NextResponse.json({ success: true, data })
}

