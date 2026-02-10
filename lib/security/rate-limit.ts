import { NextResponse, type NextRequest } from 'next/server'

type RateLimitRecord = {
  count: number
  resetAt: number
}

type RateLimitStore = Map<string, RateLimitRecord>

declare global {
  var __jobRangerRateLimitStore: RateLimitStore | undefined
}

const store: RateLimitStore = globalThis.__jobRangerRateLimitStore ?? new Map()
if (!globalThis.__jobRangerRateLimitStore) {
  globalThis.__jobRangerRateLimitStore = store
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

function cleanupExpired(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key)
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers?.get?.('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers?.get?.('x-real-ip')?.trim() || 'unknown'
}

export function consumeRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
  }

  const now = Date.now()
  cleanupExpired(now)

  const storeKey = `${bucket}:${key}`
  const current = store.get(storeKey)

  if (!current || current.resetAt <= now) {
    store.set(storeKey, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  current.count += 1

  if (current.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

export function rateLimitResponse(
  message = 'Too many requests',
  retryAfterSeconds = 60
): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: 'RATE_LIMITED', message } },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}
