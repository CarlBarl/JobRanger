import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { MAX_PARSED_CONTENT_CHARS } from '@/lib/constants'
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

  const deleteLimit = await consumeRateLimit('letter-delete-user', user.id, 120, 60 * 60 * 1000)
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

export async function PATCH(
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

  const patchLimit = await consumeRateLimit('letter-patch-user', user.id, 120, 60 * 60 * 1000)
  if (!patchLimit.allowed) {
    return rateLimitResponse(
      'Edit letter rate limit exceeded. Please try again later.',
      patchLimit.retryAfterSeconds
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing letter id' } },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const content = (body as { content?: unknown }).content
  if (typeof content !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'content must be a string' } },
      { status: 400 }
    )
  }

  const trimmedContent = content.trim()
  if (!trimmedContent) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'content cannot be empty' },
      },
      { status: 400 }
    )
  }

  if (trimmedContent.length > MAX_PARSED_CONTENT_CHARS) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `content must be at most ${MAX_PARSED_CONTENT_CHARS} characters`,
        },
      },
      { status: 413 }
    )
  }

  const existing = await prisma.generatedLetter.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Letter not found' } },
      { status: 404 }
    )
  }

  const updated = await prisma.generatedLetter.update({
    where: { id },
    data: { content: trimmedContent },
    select: { id: true, content: true },
  })

  return NextResponse.json({ success: true, data: updated })
}
