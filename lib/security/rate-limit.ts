import { NextResponse, type NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

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

let cachedRedisClient: Redis | null | false = false

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

function parseIpCandidate(value: string | null | undefined): string | null {
  if (!value) return null

  const candidate = value.trim().split(',')[0]?.trim()
  if (!candidate) return null

  if (!/^[a-fA-F0-9:.]+$/.test(candidate)) {
    return null
  }

  return candidate.slice(0, 64)
}

export function getClientIp(request: NextRequest): string {
  const vercelForwardedFor = parseIpCandidate(
    request.headers?.get?.('x-vercel-forwarded-for')
  )
  if (vercelForwardedFor) {
    return vercelForwardedFor
  }

  const realIp = parseIpCandidate(request.headers?.get?.('x-real-ip'))
  if (realIp) {
    return realIp
  }

  const forwardedFor = parseIpCandidate(request.headers?.get?.('x-forwarded-for'))
  if (!forwardedFor) return 'unknown'

  const isTrustedVercelRequest = Boolean(request.headers?.get?.('x-vercel-id'))
  if (process.env.NODE_ENV === 'production' && !isTrustedVercelRequest) {
    return 'unknown'
  }

  return forwardedFor
}

function consumeMemoryRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
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

function getRedisClient(): Redis | null {
  if (cachedRedisClient === false) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

    if (!url || !token) {
      return null
    }

    cachedRedisClient = new Redis({ url, token })
  }

  return cachedRedisClient
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return fallback
}

async function consumeDistributedRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const redis = getRedisClient()
  if (!redis) return null

  const storeKey = `rate:${bucket}:${key}`

  try {
    const rawResult = await redis.eval(
      `local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}`,
      [storeKey],
      [String(windowMs)]
    )

    const resultArray = Array.isArray(rawResult) ? rawResult : []
    const count = toFiniteNumber(resultArray[0], 1)
    const ttlMs = Math.max(1, toFiniteNumber(resultArray[1], windowMs))
    const retryAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1000))

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      }
    }

    return {
      allowed: true,
      remaining: Math.max(limit - count, 0),
      retryAfterSeconds,
    }
  } catch (error) {
    console.error(
      'Distributed rate limit fallback to memory:',
      error instanceof Error ? error.message : error
    )
    return null
  }
}

export async function consumeRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === 'test') {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 }
  }

  const distributedResult = await consumeDistributedRateLimit(bucket, key, limit, windowMs)
  if (distributedResult) {
    return distributedResult
  }

  return consumeMemoryRateLimit(bucket, key, limit, windowMs)
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
