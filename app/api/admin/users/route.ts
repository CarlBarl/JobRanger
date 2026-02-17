import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isUserAdmin } from '@/lib/security/authorization'
import {
  recordSecurityEvent,
  SecurityEventCategory,
  SecurityEventSeverity,
} from '@/lib/security/events'
import { resolveRequestId } from '@/lib/security/logging'
import { consumeRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const ipAddress = getClientIp(request)

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

  const hasAdminRole = await isUserAdmin(user.id)
  if (!hasAdminRole) {
    await recordSecurityEvent({
      category: SecurityEventCategory.ADMIN,
      severity: SecurityEventSeverity.WARN,
      eventType: 'admin.users.list.forbidden',
      actorUserId: user.id,
      requestId,
      ipAddress,
      message: 'Admin role required',
    })

    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    )
  }

  const rateLimit = await consumeRateLimit('admin-list-users', user.id, 60, 60 * 60 * 1000)
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

    await recordSecurityEvent({
      category: SecurityEventCategory.ADMIN,
      eventType: 'admin.users.list.success',
      actorUserId: user.id,
      requestId,
      ipAddress,
      metadata: { userCount: users.length },
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
