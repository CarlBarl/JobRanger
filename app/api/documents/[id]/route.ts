import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

function parseStoragePathFromPublicUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const bucketIndex = parts.indexOf('documents')
    if (bucketIndex === -1) return null
    const path = parts.slice(bucketIndex + 1).join('/')
    return path || null
  } catch {
    return null
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const id = params.id
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

  const storagePath = parseStoragePathFromPublicUrl(document.fileUrl)
  if (storagePath) {
    await supabase.storage.from('documents').remove([storagePath])
  }

  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

