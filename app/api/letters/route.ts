import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

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

  const lettersLimit = await consumeRateLimit('letters-list-user', user.id, 120, 60 * 60 * 1000)
  if (!lettersLimit.allowed) {
    return rateLimitResponse('Rate limit exceeded.', lettersLimit.retryAfterSeconds)
  }

  const letters = await prisma.generatedLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: letters })
}
