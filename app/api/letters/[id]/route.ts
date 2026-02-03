import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing letter id' } },
      { status: 400 }
    )
  }

  const res = await prisma.generatedLetter.deleteMany({
    where: { id, userId: user.id },
  })

  if (res.count === 0) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Letter not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}

