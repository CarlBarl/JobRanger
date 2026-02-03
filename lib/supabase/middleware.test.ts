import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from './middleware'

const getUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser,
    },
  })),
}))

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://example.local'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })

  it('redirects to /auth/signin for protected routes when logged out', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/dashboard')
    const res = await updateSession(req)

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toBe('http://localhost/auth/signin')
  })

  it('does not redirect for protected routes when logged in', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const req = new NextRequest('http://localhost/dashboard')
    const res = await updateSession(req)

    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })
})

