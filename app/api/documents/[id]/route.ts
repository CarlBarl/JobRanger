import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDocumentStoragePath } from '@/lib/storage'
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

  const deleteLimit = await consumeRateLimit('document-delete-user', user.id, 120, 60 * 60 * 1000)
  if (!deleteLimit.allowed) {
    return rateLimitResponse(
      'Delete document rate limit exceeded. Please try again later.',
      deleteLimit.retryAfterSeconds
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing document id' } },
      { status: 400 }
    )
  }

  // Check ownership and get fileUrl for storage cleanup
  const existing = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { id: true, fileUrl: true },
  })

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }

  if (existing.fileUrl) {
    const storagePath = getDocumentStoragePath(existing.fileUrl)
    if (storagePath) {
      await supabase.storage.from('documents').remove([storagePath])
    }
  }

  // Atomic ownership check + delete
  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findFirst({
      where: { id, userId: user.id },
    })
    if (!doc) return
    await tx.document.delete({ where: { id } })
  })

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

  const patchLimit = await consumeRateLimit('document-patch-user', user.id, 120, 60 * 60 * 1000)
  if (!patchLimit.allowed) {
    return rateLimitResponse(
      'Document update rate limit exceeded. Please try again later.',
      patchLimit.retryAfterSeconds
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing document id' } },
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

  const { parsedContent } = body as { parsedContent?: unknown }

  if (typeof parsedContent !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'parsedContent must be a string' } },
      { status: 400 }
    )
  }

  if (parsedContent.length > MAX_PARSED_CONTENT_CHARS) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `parsedContent must be at most ${MAX_PARSED_CONTENT_CHARS} characters`,
        },
      },
      { status: 413 }
    )
  }

  // Check ownership and get fileUrl for storage update
  const existing = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { id: true, fileUrl: true },
  })

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }

  // Update file in Supabase Storage if fileUrl exists
  if (existing.fileUrl) {
    const storagePath = getDocumentStoragePath(existing.fileUrl)
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .update(storagePath, Buffer.from(parsedContent), {
          contentType: 'text/plain',
          upsert: true,
        })
      if (storageError) {
        console.error('Storage update failed:', storageError.message)
      }
    }
  }

  // Atomic ownership check + update
  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findFirst({
      where: { id, userId: user.id },
    })
    if (!doc) return null
    return tx.document.update({
      where: { id },
      data: { parsedContent },
    })
  })

  if (!updated) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: updated })
}
