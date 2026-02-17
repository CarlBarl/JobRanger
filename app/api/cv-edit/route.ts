import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { UserTier } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { CV_STUDIO_MODEL, rewriteCvWithChangelog } from '@/lib/services/gemini'
import { MAX_PARSED_CONTENT_CHARS } from '@/lib/constants'
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
            message: 'CV Studio edits are available for PRO users only.',
          },
        },
        { status: 403 }
      )
    }

    const rateLimit = await consumeRateLimit('cv-edit-user', appUser.id, 20, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return rateLimitResponse(
        'CV edit rate limit exceeded. Please try again later.',
        rateLimit.retryAfterSeconds
      )
    }

    const monthlyQuotaError = await enforceMonthlyQuota({
      userId: appUser.id,
      userTier: appUser.tier,
      usageType: USAGE_EVENT_TYPES.CV_EDIT,
      message: 'Monthly CV edit quota reached for your plan.',
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

    const rewriteResult = await rewriteCvWithChangelog({
      cvContent: cvDocument.parsedContent,
      directiveText,
      jobTargets: resolvedTargets.targets,
    })

    const warnings = [...resolvedTargets.warnings]

    let improvedCv = rewriteResult.improvedCv.trim()
    if (!improvedCv) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'AI did not return updated CV content' },
        },
        { status: 500 }
      )
    }

    if (improvedCv.length > MAX_PARSED_CONTENT_CHARS) {
      improvedCv = improvedCv.slice(0, MAX_PARSED_CONTENT_CHARS)
      warnings.push(
        `Edited CV was truncated to ${MAX_PARSED_CONTENT_CHARS} characters to fit storage limits.`
      )
    }

    const newVersion = await prisma.document.create({
      data: {
        userId: appUser.id,
        type: 'cv',
        parsedContent: improvedCv,
        fileUrl: null,
      },
      select: {
        id: true,
        createdAt: true,
        parsedContent: true,
      },
    })

    try {
      await recordUsageEvent(appUser.id, USAGE_EVENT_TYPES.CV_EDIT)
    } catch (usageEventError) {
      console.error(
        'Failed to record cv edit usage event:',
        usageEventError instanceof Error ? usageEventError.message : usageEventError
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: newVersion.id,
          createdAt: newVersion.createdAt.toISOString(),
          parsedContent: newVersion.parsedContent,
        },
        changes: rewriteResult.changes,
        targeted: resolvedTargets.targets.length > 0,
        usedJobCount: resolvedTargets.targets.length,
        selectedJobCount: resolvedTargets.selectedCount,
        warnings,
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

    console.error('CV edit error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to edit CV' } },
      { status: 500 }
    )
  }
}
