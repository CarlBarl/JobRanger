import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { UserTier } from '@/generated/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { CV_STUDIO_MODEL, generateCvFeedback } from '@/lib/services/gemini'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import {
  enforceMonthlyQuota,
  recordUsageEvent,
  USAGE_EVENT_TYPES,
} from '@/lib/security/monthly-quota'
import { resolveCvJobTargets } from '@/app/api/cv/_lib/job-targets'

const MAX_TARGET_JOBS = 10

const RequestSchema = z.object({
  cvDocumentId: z.string().min(1),
  selectedJobIds: z
    .array(z.string().regex(/^\d{1,15}$/, 'Invalid job ID format'))
    .max(MAX_TARGET_JOBS, `You can target up to ${MAX_TARGET_JOBS} jobs at once`)
    .optional(),
  directiveText: z.string().trim().max(1200).optional(),
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

  if (!authUser.email) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
      },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const parsed = RequestSchema.parse(body)
    const selectedJobIds = Array.from(new Set(parsed.selectedJobIds ?? []))
    const directiveText = parsed.directiveText?.trim() || undefined

    const appUser = await getOrCreateUser(authUser.id, authUser.email)

    if (appUser.tier !== UserTier.PRO) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'CV Studio feedback is available for PRO users only.',
          },
        },
        { status: 403 }
      )
    }

    const rateLimit = await consumeRateLimit('cv-feedback-user', appUser.id, 30, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return rateLimitResponse(
        'CV feedback rate limit exceeded. Please try again later.',
        rateLimit.retryAfterSeconds
      )
    }

    const monthlyQuotaError = await enforceMonthlyQuota({
      userId: appUser.id,
      userTier: appUser.tier,
      usageType: USAGE_EVENT_TYPES.CV_FEEDBACK,
      message: 'Monthly CV feedback quota reached for your plan.',
    })
    if (monthlyQuotaError) {
      return monthlyQuotaError
    }

    const cvDocument = await prisma.document.findFirst({
      where: { id: parsed.cvDocumentId, userId: appUser.id, type: 'cv' },
      select: { id: true, parsedContent: true },
    })

    if (!cvDocument) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'CV not found' } },
        { status: 404 }
      )
    }

    if (!cvDocument.parsedContent?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'CV has no parsed content' },
        },
        { status: 400 }
      )
    }

    const resolvedTargets = await resolveCvJobTargets(appUser.id, selectedJobIds)

    const feedback = await generateCvFeedback({
      cvContent: cvDocument.parsedContent,
      directiveText,
      jobTargets: resolvedTargets.targets,
    })

    try {
      await recordUsageEvent(appUser.id, USAGE_EVENT_TYPES.CV_FEEDBACK)
    } catch (usageEventError) {
      console.error(
        'Failed to record cv feedback usage event:',
        usageEventError instanceof Error ? usageEventError.message : usageEventError
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        feedback,
        targeted: resolvedTargets.targets.length > 0,
        usedJobCount: resolvedTargets.targets.length,
        selectedJobCount: resolvedTargets.selectedCount,
        warnings: resolvedTargets.warnings,
        model: CV_STUDIO_MODEL,
      },
    })
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

    console.error('CV feedback error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate CV feedback' },
      },
      { status: 500 }
    )
  }
}
