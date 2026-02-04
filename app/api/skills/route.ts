import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { extractSkillsFromCV } from '@/lib/services/gemini'

const RequestSchema = z.object({
  documentId: z.string().min(1),
})

const UpdateSkillsSchema = z.object({
  documentId: z.string().min(1),
  skills: z.array(z.string().min(1)),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
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

// PATCH: Update skills manually
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
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
    const { documentId, skills } = UpdateSkillsSchema.parse(body)

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id, type: 'cv' },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      )
    }

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

    console.error('Skills update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update skills' },
      },
      { status: 500 }
    )
  }
}

// GET: Get skills for a document
export async function GET(request: NextRequest) {
  const supabase = await createClient()
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

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')

  if (!documentId) {
    // Return all CV skills for the user
    const cvDocument = await prisma.document.findFirst({
      where: { userId: user.id, type: 'cv' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, skills: true },
    })

    if (!cvDocument) {
      return NextResponse.json({ success: true, data: { skills: [], documentId: null } })
    }

    return NextResponse.json({
      success: true,
      data: { skills: cvDocument.skills || [], documentId: cvDocument.id },
    })
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id },
    select: { id: true, skills: true },
  })

  if (!document) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { skills: document.skills || [], documentId: document.id },
  })
}
