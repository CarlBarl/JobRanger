import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findMany: vi.fn(),
  createSignedUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
    storage: {
      from: () => ({
        createSignedUrl: mocks.createSignedUrl,
      }),
    },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findMany: mocks.findMany,
    },
  },
}))

import { GET } from './route'

describe('GET /api/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/documents')
    const res = await GET(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns documents for the user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findMany.mockResolvedValue([{ id: 'd1', fileUrl: 'u1/cv.txt' }])
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    })

    const req = new NextRequest('http://localhost/api/documents')
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: [{ id: 'd1', parsedContent: null, fileUrl: 'https://example.com/signed-url' }],
    })
  })
})
