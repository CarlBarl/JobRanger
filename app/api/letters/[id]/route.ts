import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

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

  const deleteLimit = consumeRateLimit('letter-delete-user', user.id, 120, 60 * 60 * 1000)
  if (!deleteLimit.allowed) {
    return rateLimitResponse(
      'Delete letter rate limit exceeded. Please try again later.',
      deleteLimit.retryAfterSeconds
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing letter id' } },
      { status: 400 }
    )
  }

  const res = await prisma.generatedLetter.deleteMany({
    where: { id, userId: user.id },
  })

  if (res.count === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Letter not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
