import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { generateCoverLetter } from '@/lib/services/gemini'

const RequestSchema = z.object({
  afJobId: z.string().min(1),
  documentId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { afJobId, documentId } = RequestSchema.parse(body)

    if (!authUser.email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
        },
        { status: 400 }
      )
    }

    // Ensure the DB user exists (GeneratedLetter has a FK to User).
    const user = await getOrCreateUser(authUser.id, authUser.email)

    const job = await getJobById(afJobId)
    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      )
    }

    const cvDocument = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id, type: 'cv' },
    })

    if (!cvDocument) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'CV not found' } },
        { status: 404 }
      )
    }

    // Find user's Personal Letter (optional) - use the most recent one
    const personalLetter = await prisma.document.findFirst({
      where: { userId: user.id, type: 'personal_letter' },
      orderBy: { createdAt: 'desc' },
    })

    const content = await generateCoverLetter({
      jobTitle: job.headline ?? '',
      companyName: job.employer?.name ?? undefined,
      jobDescription: job.description?.text ?? '',
      cvContent: cvDocument.parsedContent ?? '',
      personalLetterContent: personalLetter?.parsedContent ?? undefined,
    })

    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_afJobId: {
          userId: user.id,
          afJobId,
        },
      },
    })

    const createData: Prisma.GeneratedLetterUncheckedCreateInput = {
      userId: user.id,
      savedJobId: savedJob?.id,
      afJobId,
      content,
    }

    const generatedLetterModel = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'GeneratedLetter'
    )
    const supportsJobTitle = generatedLetterModel?.fields.some((field) => field.name === 'jobTitle')

    if (supportsJobTitle) {
      ;(createData as Prisma.GeneratedLetterUncheckedCreateInput & { jobTitle?: string | null })
        .jobTitle = job.headline ?? null
    }

    const letter = await prisma.generatedLetter.create({
      data: createData,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: letter.id,
        content: letter.content,
        createdAt: letter.createdAt,
      },
    })
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

    console.error('Letter generation error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate letter' } },
      { status: 500 }
    )
  }
}
