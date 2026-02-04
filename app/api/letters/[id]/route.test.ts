import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    generatedLetter: {
      deleteMany: mocks.deleteMany,
    },
  },
}))

import { DELETE } from './route'

describe('DELETE /api/letters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/letters/l1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'l1' } })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.deleteMany.mockResolvedValue({ count: 0 })

    const req = new NextRequest('http://localhost/api/letters/l1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'l1' } })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('deletes a letter for the user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.deleteMany.mockResolvedValue({ count: 1 })

    const req = new NextRequest('http://localhost/api/letters/l1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'l1' } })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: 'l1', userId: 'u1' } })
  })
})

