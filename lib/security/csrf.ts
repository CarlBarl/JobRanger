import { NextResponse, type NextRequest } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function parseTrustedOrigins(request: NextRequest): Set<string> {
  const trusted = new Set<string>([request.nextUrl.origin])
  const configured = process.env.CSRF_TRUSTED_ORIGINS

  if (configured) {
    configured
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((origin) => trusted.add(origin))
  }

  return trusted
}

function originMatches(trusted: Set<string>, candidate: string | null): boolean {
  if (!candidate) return false
  try {
    const parsed = new URL(candidate)
    return trusted.has(parsed.origin)
  } catch {
    return false
  }
}

export function enforceCsrfProtection(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'test') return null
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null

  const trustedOrigins = parseTrustedOrigins(request)
  const origin = request.headers.get('origin')

  if (origin && originMatches(trustedOrigins, origin)) {
    return null
  }

  const referer = request.headers.get('referer')
  if (!origin && referer && originMatches(trustedOrigins, referer)) {
    return null
  }

  return NextResponse.json(
    {
      success: false,
      error: { code: 'CSRF_FAILED', message: 'Request origin validation failed' },
    },
    { status: 403 }
  )
}
