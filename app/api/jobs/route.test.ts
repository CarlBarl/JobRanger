import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  searchJobs: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/services/arbetsformedlingen', () => ({
  searchJobs: mocks.searchJobs,
}))

import { GET } from './route'

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/jobs?q=dev')
    const res = await GET(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 400 when q is missing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/jobs')
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('returns results from AF', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.searchJobs.mockResolvedValue({ total: { value: 1 }, hits: [{ id: '1' }] })

    const req = new NextRequest('http://localhost/api/jobs?q=developer&limit=10&offset=5')
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { total: { value: 1 }, hits: [{ id: '1' }] },
    })

    expect(mocks.searchJobs).toHaveBeenCalledWith({
      query: 'developer',
      limit: 10,
      offset: 5,
    })
  })
})

