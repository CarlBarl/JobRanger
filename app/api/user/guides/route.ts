import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

const UpdateGuidesSchema = z.object({
  action: z.enum([
    'markDashboardPromptShown',
    'markDashboardGuideStarted',
    'markDashboardGuideCompleted',
    'markDashboardGuideDismissed',
    'restartDashboardGuide',
    'restartOnboardingGuide',
    'markOnboardingGuideCompleted',
  ]),
})

type GuideStateRecord = {
  dashboardGuidePromptedAt: Date | null
  dashboardGuideCompletedAt: Date | null
  dashboardGuideDismissedAt: Date | null
  onboardingGuideResetAt: Date | null
  onboardingGuideLastCompletedAt: Date | null
  onboardingCompleted: boolean
}

const guideStateSelect = {
  dashboardGuidePromptedAt: true,
  dashboardGuideCompletedAt: true,
  dashboardGuideDismissedAt: true,
  onboardingGuideResetAt: true,
  onboardingGuideLastCompletedAt: true,
  onboardingCompleted: true,
} as const

function serializeGuideState(record: GuideStateRecord) {
  return {
    dashboardGuidePromptedAt: record.dashboardGuidePromptedAt?.toISOString() ?? null,
    dashboardGuideCompletedAt: record.dashboardGuideCompletedAt?.toISOString() ?? null,
    dashboardGuideDismissedAt: record.dashboardGuideDismissedAt?.toISOString() ?? null,
    onboardingGuideResetAt: record.onboardingGuideResetAt?.toISOString() ?? null,
    onboardingGuideLastCompletedAt: record.onboardingGuideLastCompletedAt?.toISOString() ?? null,
    onboardingCompleted: record.onboardingCompleted,
  }
}

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      },
      { status: 401 }
    )
  }

  const rateLimit = consumeRateLimit('user-guides-read', userId, 120, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse(
      'Guide state read limit reached. Please try again later.',
      rateLimit.retryAfterSeconds
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: guideStateSelect,
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: serializeGuideState(user) })
  } catch (error) {
    console.error('Guide state read error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch guide state' },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      },
      { status: 401 }
    )
  }

  const rateLimit = consumeRateLimit('user-guides-write', userId, 60, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse(
      'Guide state update limit reached. Please try again later.',
      rateLimit.retryAfterSeconds
    )
  }

  try {
    const body = await request.json()
    const { action } = UpdateGuidesSchema.parse(body)
    const now = new Date()

    const updateData = (() => {
      switch (action) {
        case 'markDashboardPromptShown':
          return {
            dashboardGuidePromptedAt: now,
          }
        case 'markDashboardGuideStarted':
          return {
            dashboardGuideLastStartedAt: now,
          }
        case 'markDashboardGuideCompleted':
          return {
            dashboardGuidePromptedAt: now,
            dashboardGuideCompletedAt: now,
            dashboardGuideDismissedAt: null,
          }
        case 'markDashboardGuideDismissed':
          return {
            dashboardGuidePromptedAt: now,
            dashboardGuideDismissedAt: now,
          }
        case 'restartDashboardGuide':
          return {
            dashboardGuidePromptedAt: now,
            dashboardGuideCompletedAt: null,
            dashboardGuideDismissedAt: null,
          }
        case 'restartOnboardingGuide':
          return {
            onboardingCompleted: false,
            onboardingGuideResetAt: now,
          }
        case 'markOnboardingGuideCompleted':
          return {
            onboardingCompleted: true,
            onboardingGuideLastCompletedAt: now,
            onboardingGuideResetAt: null,
          }
      }
    })()

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: guideStateSelect,
    })

    return NextResponse.json({ success: true, data: serializeGuideState(user) })
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

    console.error('Guide state update error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update guide state' },
      },
      { status: 500 }
    )
  }
}
