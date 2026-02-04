import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  upsert: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: mocks.getOrCreateUser,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedJob: {
      upsert: mocks.upsert,
      findMany: mocks.findMany,
    },
  },
}))

import { GET, POST } from './route'

describe('/api/jobs/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null } })

      const req = new NextRequest('http://localhost/api/jobs/save', {
        method: 'POST',
        body: JSON.stringify({ afJobId: '123' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(401)
      await expect(res.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      })
    })

    it('returns 400 for invalid body', async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })

      const req = new NextRequest('http://localhost/api/jobs/save', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
      await expect(res.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'BAD_REQUEST' },
      })
    })

    it('upserts saved job', async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
      mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
      mocks.upsert.mockResolvedValue({ id: 'sj1', userId: 'u1', afJobId: '123', notes: 'n' })

      const req = new NextRequest('http://localhost/api/jobs/save', {
        method: 'POST',
        body: JSON.stringify({ afJobId: '123', notes: 'n' }),
      })
      const res = await POST(req)

      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({
        success: true,
        data: { id: 'sj1', userId: 'u1', afJobId: '123', notes: 'n' },
      })
      expect(mocks.upsert).toHaveBeenCalledWith({
        where: { userId_afJobId: { userId: 'u1', afJobId: '123' } },
        update: { notes: 'n' },
        create: { userId: 'u1', afJobId: '123', notes: 'n' },
      })
    })
  })

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null } })

      const req = new NextRequest('http://localhost/api/jobs/save')
      const res = await GET(req)

      expect(res.status).toBe(401)
      await expect(res.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      })
    })

    it('returns saved jobs', async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
      mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
      mocks.findMany.mockResolvedValue([{ id: 'sj1' }])

      const req = new NextRequest('http://localhost/api/jobs/save')
      const res = await GET(req)

      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({ success: true, data: [{ id: 'sj1' }] })
    })
  })
})

