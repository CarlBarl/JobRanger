import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { resolveDocumentAccessUrl } from '@/lib/storage'

export async function GET(request: NextRequest) {
  void request
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

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const documentsWithAccessUrls = await Promise.all(
    documents.map(async (document) => ({
      ...document,
      fileUrl: await resolveDocumentAccessUrl(supabase, document.fileUrl),
    }))
  )

  return NextResponse.json({ success: true, data: documentsWithAccessUrls })
}
