import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isUserAdmin: vi.fn(),
  findMany: vi.fn(),
  recordSecurityEvent: vi.fn(),
  consumeRateLimit: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/security/authorization', () => ({
  isUserAdmin: (...args: unknown[]) => mocks.isUserAdmin(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mocks.findMany(...args),
    },
  },
}))

vi.mock('@/lib/security/events', () => ({
  recordSecurityEvent: (...args: unknown[]) => mocks.recordSecurityEvent(...args),
  SecurityEventCategory: {
    ADMIN: 'ADMIN',
  },
  SecurityEventSeverity: {
    WARN: 'WARN',
  },
}))

vi.mock('@/lib/security/logging', () => ({
  resolveRequestId: () => 'req_test',
}))

vi.mock('@/lib/security/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  consumeRateLimit: (...args: unknown[]) => mocks.consumeRateLimit(...args),
  rateLimitResponse: () => new Response(null, { status: 429 }),
}))

import { GET } from './route'

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, remaining: 59, retryAfterSeconds: 0 })
    mocks.findMany.mockResolvedValue([])
  })

  it('returns 401 when not authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(new NextRequest('http://localhost/api/admin/users'))
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } })
    mocks.isUserAdmin.mockResolvedValue(false)

    const response = await GET(new NextRequest('http://localhost/api/admin/users'))
    expect(response.status).toBe(403)
    expect(mocks.recordSecurityEvent).toHaveBeenCalled()
  })

  it('returns user list for admin users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@example.com' } } })
    mocks.isUserAdmin.mockResolvedValue(true)
    mocks.findMany.mockResolvedValue([{ id: 'u1', email: 'u1@example.com' }])

    const response = await GET(new NextRequest('http://localhost/api/admin/users'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: 'u1', email: 'u1@example.com' }],
    })
  })
})
