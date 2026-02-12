import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { isValidAfJobId } from '@/lib/security/sanitize'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const jobLimit = consumeRateLimit('job-detail-user', user.id, 200, 60 * 60 * 1000)
  if (!jobLimit.allowed) {
    return rateLimitResponse('Rate limit exceeded.', jobLimit.retryAfterSeconds)
  }

  const { id } = await params

  if (!id || !isValidAfJobId(id)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid job ID format' },
      },
      { status: 400 }
    )
  }

  const data = await getJobById(id)
  return NextResponse.json({ success: true, data })
}

