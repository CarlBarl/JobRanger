import { NextRequest, NextResponse } from 'next/server'
import { locales, type Locale } from '@/i18n/config'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import {
  consumeRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const localeLimit = await consumeRateLimit('locale-write-ip', getClientIp(request), 120, 60 * 60 * 1000)
  if (!localeLimit.allowed) {
    return rateLimitResponse('Too many locale change requests. Please try again later.', localeLimit.retryAfterSeconds)
  }

  let locale: unknown
  try {
    const body = await request.json()
    locale = (body as { locale?: unknown }).locale
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  if (!locales.includes(locale as Locale)) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid locale' } },
      { status: 400 }
    )
  }

  const validatedLocale = locale as Locale

  const response = NextResponse.json({ success: true })
  response.cookies.set('locale', validatedLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })

  return response
}
