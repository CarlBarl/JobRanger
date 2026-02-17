import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

const SaveJobSchema = z.object({
  afJobId: z.string().min(1).regex(/^\d{1,15}$/, 'Invalid job ID format'),
  notes: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { afJobId, notes } = SaveJobSchema.parse(body)

    if (!authUser.email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
        },
        { status: 400 }
      )
    }

    const user = await getOrCreateUser(authUser.id, authUser.email)
    const writeLimit = await consumeRateLimit('saved-job-write-user', user.id, 120, 60 * 60 * 1000)
    if (!writeLimit.allowed) {
      return rateLimitResponse(
        'Save job rate limit exceeded. Please try again later.',
        writeLimit.retryAfterSeconds
      )
    }

    // Fetch job details from AF API to cache
    let cached: {
      headline?: string
      employer?: string
      location?: string
      occupation?: string
      deadline?: string | null
      webpageUrl?: string | null
    } = {}
    try {
      const job = await getJobById(afJobId)
      cached = {
        headline: job.headline || undefined,
        employer: job.employer?.name || undefined,
        location: job.workplace_address?.municipality || job.workplace_address?.region || undefined,
        occupation: job.occupation?.label || undefined,
        deadline: job.application_deadline || null,
        webpageUrl: job.webpage_url || null,
      }
    } catch {
      // AF API may be unavailable; save without cache
    }

    const savedJob = await prisma.savedJob.upsert({
      where: {
        userId_afJobId: {
          userId: user.id,
          afJobId,
        },
      },
      update: { notes, ...cached },
      create: { userId: user.id, afJobId, notes, ...cached },
    })

    return NextResponse.json({ success: true, data: savedJob })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: error.issues[0]?.message ?? 'Invalid body' },
        },
        { status: 400 }
      )
    }

    console.error('Save job error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save job' } },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  void request
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: authUser.id },
    orderBy: { savedAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: savedJobs })
}
