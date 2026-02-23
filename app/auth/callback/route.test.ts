import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
  }),
}))

const authMocks = vi.hoisted(() => ({
  getOrCreateUser: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: authMocks.getOrCreateUser,
}))

import { GET } from './route'

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to dashboard on successful exchange', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    })

    const res = await GET(new Request('https://example.com/auth/callback?code=abc123'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://example.com/dashboard')
    expect(authMocks.getOrCreateUser).toHaveBeenCalledWith('user-1', 'test@example.com')
  })

  it('sanitizes untrusted next paths', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    })

    const res = await GET(
      new Request('https://example.com/auth/callback?code=abc123&next=https://evil.com')
    )

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://example.com/dashboard')
    expect(authMocks.getOrCreateUser).toHaveBeenCalledWith('user-1', 'test@example.com')
  })
})
