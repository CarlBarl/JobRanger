import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

const ADMIN_EMAIL = process.env.DEBUG_EMAIL

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  const rateLimit = consumeRateLimit('admin-list-users', user.id, 60, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse('Rate limit exceeded. Please try again later.', rateLimit.retryAfterSeconds)
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        onboardingCompleted: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
            savedJobs: true,
            generatedLetters: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Admin list users error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' } },
      { status: 500 }
    )
  }
}
