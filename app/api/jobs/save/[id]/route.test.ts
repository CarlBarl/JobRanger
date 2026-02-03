import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedJob: {
      delete: mocks.delete,
    },
  },
}))

import { DELETE } from './route'

describe('DELETE /api/jobs/save/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/jobs/save/123', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: '123' } })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('deletes saved job by afJobId', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.delete.mockResolvedValue({ id: 'sj1' })

    const req = new NextRequest('http://localhost/api/jobs/save/123', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: '123' } })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })

    expect(mocks.delete).toHaveBeenCalledWith({
      where: { userId_afJobId: { userId: 'u1', afJobId: '123' } },
    })
  })
})

