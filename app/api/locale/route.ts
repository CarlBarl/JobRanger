import { NextRequest, NextResponse } from 'next/server'
import { locales, type Locale } from '@/i18n/config'
import { enforceCsrfProtection } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const { locale } = await request.json()

  if (!locales.includes(locale as Locale)) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid locale' } },
      { status: 400 }
    )
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })

  return response
}
