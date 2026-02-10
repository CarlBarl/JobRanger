import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
    },
  }),
}))

import { GET } from './route'

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to dashboard on successful exchange', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })

    const res = await GET(new Request('https://example.com/auth/callback?code=abc123'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://example.com/dashboard')
  })

  it('sanitizes untrusted next paths', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })

    const res = await GET(
      new Request('https://example.com/auth/callback?code=abc123&next=https://evil.com')
    )

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://example.com/dashboard')
  })
})
