import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { consumeRateLimit } from '@/lib/security/rate-limit'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for Upstash integration tests`)
  return value
}

describe('upstash integration (rate limit)', () => {
  it('denies after exceeding the limit', async () => {
    requireEnv('UPSTASH_REDIS_REST_URL')
    requireEnv('UPSTASH_REDIS_REST_TOKEN')

    if (
      process.env.RATE_LIMIT_ENABLE_IN_TEST !== '1' &&
      process.env.RATE_LIMIT_ENABLE_IN_TEST !== 'true'
    ) {
      throw new Error('RATE_LIMIT_ENABLE_IN_TEST must be enabled for this test suite')
    }

    const bucket = `upstash-ci-${Date.now()}`
    const key = crypto.randomUUID()
    const limit = 2
    const windowMs = 60_000

    const r1 = await consumeRateLimit(bucket, key, limit, windowMs)
    const r2 = await consumeRateLimit(bucket, key, limit, windowMs)
    const r3 = await consumeRateLimit(bucket, key, limit, windowMs)

    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(false)
    expect(r3.retryAfterSeconds).toBeGreaterThan(0)
  })
})

