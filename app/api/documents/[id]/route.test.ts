import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findFirst: vi.fn(),
  delete: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
    storage: {
      from: () => ({
        remove: mocks.remove,
      }),
    },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: mocks.findFirst,
      delete: mocks.delete,
    },
  },
}))

import { DELETE } from './route'

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/documents/d1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'd1' } })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when document not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/documents/d1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'd1' } })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('deletes document and removes storage object when possible', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue({
      id: 'd1',
      userId: 'u1',
      fileUrl:
        'https://example.supabase.co/storage/v1/object/public/documents/u1/1-cv.txt',
    })
    mocks.remove.mockResolvedValue({ data: [], error: null })
    mocks.delete.mockResolvedValue({ id: 'd1' })

    const req = new NextRequest('http://localhost/api/documents/d1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'd1' } })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(mocks.remove).toHaveBeenCalledWith(['u1/1-cv.txt'])
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'd1' } })
  })
})

