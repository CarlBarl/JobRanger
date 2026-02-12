import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { extractSkillsFromCV } from '@/lib/services/gemini'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

const RequestSchema = z.object({
  documentId: z.string().min(1),
})

const UpdateSkillsSchema = z.object({
  documentId: z.string().min(1),
  skills: z.array(z.string().min(1)),
})

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

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

  const extractLimit = consumeRateLimit('skills-extract-user', user.id, 30, 60 * 60 * 1000)
  if (!extractLimit.allowed) {
    return rateLimitResponse(
      'Skills extraction limit reached. Please try again later.',
      extractLimit.retryAfterSeconds
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

    console.error('Skills extraction error:', error instanceof Error ? error.message : error)
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
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

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

  const updateLimit = consumeRateLimit('skills-update-user', user.id, 120, 60 * 60 * 1000)
  if (!updateLimit.allowed) {
    return rateLimitResponse(
      'Skills update limit reached. Please try again later.',
      updateLimit.retryAfterSeconds
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

    console.error('Skills update error:', error instanceof Error ? error.message : error)
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
