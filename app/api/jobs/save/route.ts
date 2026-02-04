import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'

const SaveJobSchema = z.object({
  afJobId: z.string().min(1),
  notes: z.string().optional(),
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
    const { afJobId, notes } = SaveJobSchema.parse(body)

    if (!authUser.email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
        },
        { status: 400 }
      )
    }

    const user = await getOrCreateUser(authUser.id, authUser.email)

    const savedJob = await prisma.savedJob.upsert({
      where: {
        userId_afJobId: {
          userId: user.id,
          afJobId,
        },
      },
      update: { notes },
      create: { userId: user.id, afJobId, notes },
    })

    return NextResponse.json({ success: true, data: savedJob })
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

    console.error('Save job error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save job' } },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  void request
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

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: authUser.id },
    orderBy: { savedAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: savedJobs })
}
