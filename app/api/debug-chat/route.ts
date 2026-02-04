import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chat, GEMINI_MODEL } from '@/lib/services/gemini'

const DEBUG_EMAIL = 'carlelelid@gmail.com'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || user.email !== DEBUG_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const response = await chat(message)

    return NextResponse.json({ response, model: GEMINI_MODEL })
  } catch (error) {
    console.error('Debug chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get response' },
      { status: 500 }
    )
  }
}
