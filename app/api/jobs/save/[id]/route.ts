import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { isValidAfJobId } from '@/lib/security/sanitize'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const writeLimit = await consumeRateLimit('saved-job-delete-user', user.id, 120, 60 * 60 * 1000)
  if (!writeLimit.allowed) {
    return rateLimitResponse(
      'Delete saved job rate limit exceeded. Please try again later.',
      writeLimit.retryAfterSeconds
    )
  }

  const { id: afJobId } = await params
  if (!afJobId || !isValidAfJobId(afJobId)) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid job ID format' } },
      { status: 400 }
    )
  }

  try {
    await prisma.savedJob.delete({
      where: { userId_afJobId: { userId: user.id, afJobId } },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Saved job not found' } },
        { status: 404 }
      )
    }

    console.error('Delete saved job error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete saved job' } },
      { status: 500 }
    )
  }
}
