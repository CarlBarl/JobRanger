import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDocumentStoragePath } from '@/lib/storage'
import { isUserAdmin } from '@/lib/security/authorization'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import {
  recordSecurityEvent,
  SecurityEventCategory,
  SecurityEventSeverity,
} from '@/lib/security/events'
import { resolveRequestId } from '@/lib/security/logging'
import { consumeRateLimit, getClientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = resolveRequestId(request)
  const ipAddress = getClientIp(request)

  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

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
      eventType: 'admin.users.delete.forbidden',
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

  const rateLimit = await consumeRateLimit('admin-delete-user', user.id, 20, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse('Rate limit exceeded. Please try again later.', rateLimit.retryAfterSeconds)
  }

  const { id: targetUserId } = await params

  if (targetUserId === user.id) {
    await recordSecurityEvent({
      category: SecurityEventCategory.ADMIN,
      severity: SecurityEventSeverity.WARN,
      eventType: 'admin.users.delete.self_blocked',
      actorUserId: user.id,
      targetUserId,
      requestId,
      ipAddress,
      message: 'Admin self-delete blocked',
    })

    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Cannot delete your own account from admin panel' } },
      { status: 400 }
    )
  }

  try {
    // Verify target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) {
      await recordSecurityEvent({
        category: SecurityEventCategory.ADMIN,
        severity: SecurityEventSeverity.WARN,
        eventType: 'admin.users.delete.not_found',
        actorUserId: user.id,
        targetUserId,
        requestId,
        ipAddress,
      })

      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    const serviceClient = createServiceClient()

    // 1. Delete Supabase Auth user via service role (fail closed)
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(targetUserId)
    if (authDeleteError) {
      console.error('Admin: Auth user deletion error:', authDeleteError.message)
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user auth account' } },
        { status: 500 }
      )
    }

    // 2. Delete user's files from Supabase Storage
    const documents = await prisma.document.findMany({
      where: { userId: targetUserId },
      select: { fileUrl: true },
    })

    const storagePaths = documents
      .map((doc: { fileUrl: string | null }) => getDocumentStoragePath(doc.fileUrl))
      .filter((path: string | null): path is string => path !== null)

    if (storagePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from('documents')
        .remove(storagePaths)
      if (storageError) {
        console.error('Admin: Storage cleanup error:', storageError.message)
        // Continue - storage files are secondary
      }
    }

    // 3. Delete User row (cascades to Document, SavedJob, GeneratedLetter)
    await prisma.user.delete({ where: { id: targetUserId } })

    await recordSecurityEvent({
      category: SecurityEventCategory.ADMIN,
      severity: SecurityEventSeverity.WARN,
      eventType: 'admin.users.delete.success',
      actorUserId: user.id,
      targetUserId,
      requestId,
      ipAddress,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    await recordSecurityEvent({
      category: SecurityEventCategory.ADMIN,
      severity: SecurityEventSeverity.ERROR,
      eventType: 'admin.users.delete.error',
      actorUserId: user.id,
      targetUserId,
      requestId,
      ipAddress,
      message: error instanceof Error ? error.message : String(error),
    })

    console.error('Admin: User deletion error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' } },
      { status: 500 }
    )
  }
}
