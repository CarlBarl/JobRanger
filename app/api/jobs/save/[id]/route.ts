import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
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

  const afJobId = params.id
  if (!afJobId) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing job id' } },
      { status: 400 }
    )
  }

  try {
    await prisma.savedJob.delete({
      where: { userId_afJobId: { userId: user.id, afJobId } },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Saved job not found' } },
      { status: 404 }
    )
  }
}

