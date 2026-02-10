import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import {
  consumeRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type SignInError = { success: false; error: { code: string; message: string } }

type SignInSuccess = { success: true }

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const body = await request.json()
    const { email, password } = RequestSchema.parse(body)
    const clientIp = getClientIp(request)

    const ipLimit = consumeRateLimit('signin-ip', clientIp, 20, 15 * 60 * 1000)
    if (!ipLimit.allowed) {
      return rateLimitResponse('Too many sign-in attempts. Please try again later.', ipLimit.retryAfterSeconds)
    }

    const emailLimit = consumeRateLimit(
      'signin-email',
      email.toLowerCase(),
      8,
      15 * 60 * 1000
    )
    if (!emailLimit.allowed) {
      return rateLimitResponse('Too many sign-in attempts. Please try again later.', emailLimit.retryAfterSeconds)
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json<SignInError>(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        },
        { status: 401 }
      )
    }

    return NextResponse.json<SignInSuccess>({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<SignInError>(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.issues[0]?.message ?? 'Invalid request body',
          },
        },
        { status: 400 }
      )
    }

    console.error('Password sign in error:', error)
    return NextResponse.json<SignInError>(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to sign in' },
      },
      { status: 500 }
    )
  }
}
