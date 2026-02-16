import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { z } from 'zod'

const CompleteOnboardingSchema = z.object({
  completed: z.literal(true, { message: 'completed must be true' }),
})

export async function PATCH(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

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

  const rateLimit = await consumeRateLimit('user-onboarding', user.id, 10, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse(
      'Onboarding update limit reached. Please try again later.',
      rateLimit.retryAfterSeconds
    )
  }

  try {
    const body = await request.json()
    CompleteOnboardingSchema.parse(body)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        onboardingGuideLastCompletedAt: new Date(),
        onboardingGuideResetAt: null,
      },
    })

    return NextResponse.json({ success: true })
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

    console.error('Onboarding update error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update onboarding status' },
      },
      { status: 500 }
    )
  }
}
