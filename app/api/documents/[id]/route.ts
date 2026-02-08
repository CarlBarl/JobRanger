import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDocumentStoragePath } from '@/lib/storage'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing document id' } },
      { status: 400 }
    )
  }

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }

  if (document.fileUrl) {
    const storagePath = getDocumentStoragePath(document.fileUrl)
    if (storagePath) {
      await supabase.storage.from('documents').remove([storagePath])
    }
  }

  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }

  // Update file in Supabase Storage if fileUrl exists
  if (document.fileUrl) {
    const storagePath = getDocumentStoragePath(document.fileUrl)
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .update(storagePath, Buffer.from(parsedContent), {
          contentType: 'text/plain',
          upsert: true,
        })
      if (storageError) {
        console.error('Storage update failed:', storageError.message)
        // Continue anyway - database is the source of truth
      }
    }
  }

  // Update database
  const updated = await prisma.document.update({
    where: { id },
    data: { parsedContent },
  })

  return NextResponse.json({ success: true, data: updated })
}
