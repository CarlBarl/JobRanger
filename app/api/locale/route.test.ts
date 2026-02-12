import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
}))

vi.mock('@/lib/security/csrf', () => ({
  enforceCsrfProtection: () => null,
}))

vi.mock('@/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/rate-limit')>(
    '@/lib/security/rate-limit'
  )
  return {
    ...actual,
    getClientIp: () => '127.0.0.1',
    consumeRateLimit: (...args: unknown[]) => mocks.consumeRateLimit(...args),
  }
})

import { POST } from './route'

describe('POST /api/locale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consumeRateLimit.mockReturnValue({
      allowed: true,
      remaining: 119,
      retryAfterSeconds: 0,
    })
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/locale', {
      method: 'POST',
      body: '{"locale":',
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { message: 'Invalid JSON body' },
    })
  })

  it('returns 429 when rate limited', async () => {
    mocks.consumeRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 42,
    })

    const req = new NextRequest('http://localhost/api/locale', {
      method: 'POST',
      body: JSON.stringify({ locale: 'sv' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
  })

  it('sets hardened locale cookie on success', async () => {
    const req = new NextRequest('http://localhost/api/locale', {
      method: 'POST',
      body: JSON.stringify({ locale: 'sv' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('locale=sv')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=lax')
  })
})
