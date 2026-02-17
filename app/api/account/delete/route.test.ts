import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockStorageRemove = vi.fn()
const mockAdminDeleteUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    storage: {
      from: () => ({
        remove: (paths: string[]) => mockStorageRemove(paths),
      }),
    },
  }),
  createServiceClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        deleteUser: (id: string) => mockAdminDeleteUser(id),
      },
    },
  }),
}))

const mockFindMany = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    user: { delete: (...args: unknown[]) => mockDelete(...args) },
  },
}))

vi.mock('@/lib/security/csrf', () => ({
  enforceCsrfProtection: () => null,
}))

vi.mock('@/lib/security/rate-limit', () => ({
  consumeRateLimit: () => ({ allowed: true, remaining: 2, retryAfterSeconds: 0 }),
  rateLimitResponse: () => null,
}))

vi.mock('@/lib/security/events', () => ({
  recordSecurityEvent: vi.fn(),
  SecurityEventCategory: {
    AUTH: 'AUTH',
  },
  SecurityEventSeverity: {
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
}))

import { DELETE } from './route'

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/account/delete', {
    method: 'DELETE',
  })
}

describe('DELETE /api/account/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await DELETE(makeRequest())
    expect(res.status).toBe(401)
  })

  it('deletes user data and auth account on success', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@test.com' } },
    })
    mockFindMany.mockResolvedValue([
      { fileUrl: 'user-123/file1.pdf' },
      { fileUrl: 'user-123/file2.pdf' },
    ])
    mockStorageRemove.mockResolvedValue({ error: null })
    mockDelete.mockResolvedValue({ id: 'user-123' })
    mockAdminDeleteUser.mockResolvedValue({ error: null })

    const res = await DELETE(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockStorageRemove).toHaveBeenCalledWith([
      'user-123/file1.pdf',
      'user-123/file2.pdf',
    ])
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'user-123' } })
    expect(mockAdminDeleteUser).toHaveBeenCalledWith('user-123')
  })

  it('continues deletion even when storage cleanup fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-456', email: 'test@test.com' } },
    })
    mockFindMany.mockResolvedValue([{ fileUrl: 'user-456/file.pdf' }])
    mockStorageRemove.mockResolvedValue({ error: { message: 'Storage error' } })
    mockDelete.mockResolvedValue({ id: 'user-456' })
    mockAdminDeleteUser.mockResolvedValue({ error: null })

    const res = await DELETE(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockDelete).toHaveBeenCalled()
  })

  it('returns 500 and skips DB deletion when auth deletion fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-789', email: 'test@test.com' } },
    })
    mockAdminDeleteUser.mockResolvedValue({ error: { message: 'Auth delete failed' } })

    const res = await DELETE(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
