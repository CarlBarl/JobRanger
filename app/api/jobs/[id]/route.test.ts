import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getJobById: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/services/arbetsformedlingen', () => ({
  getJobById: mocks.getJobById,
}))

import { GET } from './route'

describe('GET /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/jobs/123')
    const res = await GET(req, { params: { id: '123' } })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns job details', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.getJobById.mockResolvedValue({ id: '123', headline: 'Dev' })

    const req = new NextRequest('http://localhost/api/jobs/123')
    const res = await GET(req, { params: { id: '123' } })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { id: '123', headline: 'Dev' },
    })
    expect(mocks.getJobById).toHaveBeenCalledWith('123')
  })
})

