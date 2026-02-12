import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chat, GEMINI_MODEL } from '@/lib/services/gemini'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

const DEBUG_EMAIL = process.env.DEBUG_EMAIL

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || user.email !== DEBUG_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const debugLimit = consumeRateLimit('debug-chat-user', user.id, 60, 60 * 60 * 1000)
  if (!debugLimit.allowed) {
    return rateLimitResponse(
      'Debug chat rate limit exceeded. Please try again later.',
      debugLimit.retryAfterSeconds
    )
  }

  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    const response = await chat(message)

    return NextResponse.json({ response, model: GEMINI_MODEL })
  } catch (error) {
    console.error('Debug chat error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get response' },
      { status: 500 }
    )
  }
}
