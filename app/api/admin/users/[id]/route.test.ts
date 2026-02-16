import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isUserAdmin: vi.fn(),
  consumeRateLimit: vi.fn(),
  recordSecurityEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
  createServiceClient: () => ({
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
    storage: {
      from: () => ({
        remove: vi.fn(),
      }),
    },
  }),
}))

vi.mock('@/lib/security/authorization', () => ({
  isUserAdmin: (...args: unknown[]) => mocks.isUserAdmin(...args),
}))

vi.mock('@/lib/security/events', () => ({
  recordSecurityEvent: (...args: unknown[]) => mocks.recordSecurityEvent(...args),
  SecurityEventCategory: {
    ADMIN: 'ADMIN',
  },
  SecurityEventSeverity: {
    WARN: 'WARN',
    ERROR: 'ERROR',
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
  },
}))

import { DELETE } from './route'

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, remaining: 19, retryAfterSeconds: 0 })
  })

  it('returns 403 when user is not admin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } })
    mocks.isUserAdmin.mockResolvedValue(false)

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/users/u2', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'u2' }) }
    )

    expect(response.status).toBe(403)
    expect(mocks.recordSecurityEvent).toHaveBeenCalled()
  })
})
