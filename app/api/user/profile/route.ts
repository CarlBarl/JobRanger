import { NextRequest, NextResponse } from 'next/server'
import { UsageEventType } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getMonthlyQuotaSnapshot } from '@/lib/security/monthly-quota'
import { z } from 'zod'

const MAX_GUIDANCE_CHARS = 1200

const UpdateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(100, 'Name must be 100 characters or less')
      .optional(),
    letterGuidanceDefault: z
      .string()
      .trim()
      .max(
        MAX_GUIDANCE_CHARS,
        `Guidance must be ${MAX_GUIDANCE_CHARS} characters or less`
      )
      .optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.letterGuidanceDefault !== undefined,
    { message: 'At least one profile field is required' }
  )

export async function GET() {
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

  const rateLimit = consumeRateLimit('user-profile-read', user.id, 120, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse(
      'Profile read limit reached. Please try again later.',
      rateLimit.retryAfterSeconds
    )
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        letterGuidanceDefault: true,
        tier: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
        { status: 404 }
      )
    }

    const generateLetterQuota = await getMonthlyQuotaSnapshot({
      userId: user.id,
      userTier: profile.tier,
      usageType: UsageEventType.GENERATE_LETTER,
    })

    return NextResponse.json({
      success: true,
      data: {
        name: profile.name ?? null,
        letterGuidanceDefault: profile.letterGuidanceDefault ?? null,
        tier: profile.tier,
        quotas: {
          generateLetter: {
            limit: generateLetterQuota.limit,
            used: generateLetterQuota.used,
            remaining: generateLetterQuota.remaining,
            resetAt: generateLetterQuota.resetAt,
            isExhausted: generateLetterQuota.isExhausted,
          },
        },
      },
    })
  } catch (error) {
    console.error('Profile read error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' },
      },
      { status: 500 }
    )
  }
}

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

  const rateLimit = consumeRateLimit('user-profile-update', user.id, 20, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse(
      'Profile update limit reached. Please try again later.',
      rateLimit.retryAfterSeconds
    )
  }

  try {
    const body = await request.json()
    const parsed = UpdateProfileSchema.parse(body)

    const updateData: { name?: string; letterGuidanceDefault?: string | null } = {}
    if (parsed.name !== undefined) {
      updateData.name = parsed.name
    }
    if (parsed.letterGuidanceDefault !== undefined) {
      updateData.letterGuidanceDefault =
        parsed.letterGuidanceDefault.trim().length > 0
          ? parsed.letterGuidanceDefault
          : null
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        name: true,
        letterGuidanceDefault: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        name: updated.name ?? null,
        letterGuidanceDefault: updated.letterGuidanceDefault ?? null,
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

    console.error('Profile update error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' },
      },
      { status: 500 }
    )
  }
}
