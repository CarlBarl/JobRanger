import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { Prisma, UsageEventType, UserTier } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { generateCoverLetter } from '@/lib/services/gemini'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { enforceMonthlyQuota, recordUsageEvent } from '@/lib/security/monthly-quota'

const RequestSchema = z.object({
  afJobId: z.string().min(1).regex(/^\d{1,15}$/, 'Invalid job ID format'),
  documentId: z.string().min(1),
  guidanceOverride: z.string().trim().max(1200).optional(),
  guideBonus: z.boolean().optional(),
})

const GUIDE_BONUS_MAX_AGE_MS = 6 * 60 * 60 * 1000

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
    const { afJobId, documentId, guidanceOverride, guideBonus } = RequestSchema.parse(body)

    if (!authUser.email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
        },
        { status: 400 }
      )
    }

    // Ensure the DB user exists (GeneratedLetter has a FK to User).
    const user = await getOrCreateUser(authUser.id, authUser.email)
    const guidanceOverrideTrimmed = guidanceOverride?.trim() || undefined
    const defaultGuidanceTrimmed = user.letterGuidanceDefault?.trim() || undefined
    const resolvedGuidance = guidanceOverrideTrimmed ?? defaultGuidanceTrimmed
    const wantsGuideBonus = Boolean(guideBonus)

    const userLimit = consumeRateLimit('generate-letter-user', user.id, 20, 60 * 60 * 1000)
    if (!userLimit.allowed) {
      return rateLimitResponse(
        'Letter generation limit reached. Please try again later.',
        userLimit.retryAfterSeconds
      )
    }

    const now = new Date()
    const bonusWindowStart = new Date(now.getTime() - GUIDE_BONUS_MAX_AGE_MS)
    const canAttemptGuideBonus =
      wantsGuideBonus &&
      user.tier === UserTier.FREE &&
      !user.dashboardGuideBonusGenerateLetterUsedAt &&
      Boolean(user.dashboardGuideLastStartedAt) &&
      (user.dashboardGuideLastStartedAt?.getTime() ?? 0) >= bonusWindowStart.getTime()

    if (!wantsGuideBonus) {
      const monthlyQuotaError = await enforceMonthlyQuota({
        userId: user.id,
        userTier: user.tier,
        usageType: UsageEventType.GENERATE_LETTER,
        message: 'Monthly letter generation quota reached for your plan.',
        now,
      })
      if (monthlyQuotaError) {
        return monthlyQuotaError
      }
    }

    const job = await getJobById(afJobId)
    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      )
    }

    const cvDocument = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id, type: 'cv' },
    })

    if (!cvDocument) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'CV not found' } },
        { status: 404 }
      )
    }

    let guideBonusReserved = false
    if (canAttemptGuideBonus) {
      const reservation = await prisma.user.updateMany({
        where: {
          id: user.id,
          tier: UserTier.FREE,
          dashboardGuideBonusGenerateLetterUsedAt: null,
          dashboardGuideLastStartedAt: { gte: bonusWindowStart },
        },
        data: {
          dashboardGuideBonusGenerateLetterUsedAt: now,
        },
      })

      guideBonusReserved = reservation.count === 1
    }

    if (wantsGuideBonus && !guideBonusReserved) {
      const monthlyQuotaError = await enforceMonthlyQuota({
        userId: user.id,
        userTier: user.tier,
        usageType: UsageEventType.GENERATE_LETTER,
        message: 'Monthly letter generation quota reached for your plan.',
        now,
      })
      if (monthlyQuotaError) {
        return monthlyQuotaError
      }
    }

    // Find user's Personal Letter (optional) - use the most recent one
    const personalLetter = await prisma.document.findFirst({
      where: { userId: user.id, type: 'personal_letter' },
      orderBy: { createdAt: 'desc' },
    })

    const content = await generateCoverLetter({
      jobTitle: job.headline ?? '',
      companyName: job.employer?.name ?? undefined,
      jobDescription: job.description?.text ?? '',
      cvContent: cvDocument.parsedContent ?? '',
      personalLetterContent: personalLetter?.parsedContent ?? undefined,
      userGuidance: resolvedGuidance,
    })

    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_afJobId: {
          userId: user.id,
          afJobId,
        },
      },
    })

    const createData: Prisma.GeneratedLetterUncheckedCreateInput = {
      userId: user.id,
      savedJobId: savedJob?.id,
      afJobId,
      content,
    }

    const generatedLetterModel = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'GeneratedLetter'
    )
    const supportsJobTitle = generatedLetterModel?.fields.some((field) => field.name === 'jobTitle')
    const supportsGuidanceUsed = generatedLetterModel?.fields.some(
      (field) => field.name === 'guidanceUsed'
    )

    if (supportsJobTitle) {
      ;(createData as Prisma.GeneratedLetterUncheckedCreateInput & { jobTitle?: string | null })
        .jobTitle = job.headline ?? null
    }

    if (supportsGuidanceUsed) {
      ;(createData as Prisma.GeneratedLetterUncheckedCreateInput & { guidanceUsed?: string | null })
        .guidanceUsed = resolvedGuidance ?? null
    }

    const letter = await prisma.generatedLetter.create({
      data: createData,
    })

    if (!guideBonusReserved) {
      try {
        await recordUsageEvent(user.id, UsageEventType.GENERATE_LETTER)
      } catch (usageEventError) {
        console.error(
          'Failed to record generate usage event:',
          usageEventError instanceof Error ? usageEventError.message : usageEventError
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: letter.id,
        content: letter.content,
        createdAt: letter.createdAt,
        guideBonusApplied: guideBonusReserved,
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

    console.error('Letter generation error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate letter' } },
      { status: 500 }
    )
  }
}
