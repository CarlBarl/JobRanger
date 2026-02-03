import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { extractSkillsFromCV } from '@/lib/services/gemini'

const RequestSchema = z.object({
  documentId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { documentId } = RequestSchema.parse(body)

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id, type: 'cv' },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      )
    }

    if (!document.parsedContent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Document has no parsed content' },
        },
        { status: 400 }
      )
    }

    const skills = await extractSkillsFromCV(document.parsedContent)

    await prisma.document.update({
      where: { id: documentId },
      data: { skills },
    })

    return NextResponse.json({ success: true, data: { skills } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: error.issues[0]?.message ?? 'Invalid body' },
        },
        { status: 400 }
      )
    }

    // Avoid logging sensitive content (CV text). We only log the error itself.
    console.error('Skills extraction error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to extract skills' },
      },
      { status: 500 }
    )
  }
}
