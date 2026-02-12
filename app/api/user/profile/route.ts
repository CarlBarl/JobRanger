import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { z } from 'zod'

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
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

  const rateLimit = consumeRateLimit('user-profile-update', user.id, 20, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse(
      'Profile update limit reached. Please try again later.',
      rateLimit.retryAfterSeconds
    )
  }

  try {
    const body = await request.json()
    const { name } = UpdateProfileSchema.parse(body)

    await prisma.user.update({
      where: { id: user.id },
      data: { name },
    })

    return NextResponse.json({ success: true, data: { name } })
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
