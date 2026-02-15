import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
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
    user: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}))

import { GET, PATCH } from './route'

describe('/api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns profile data for authenticated user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findUnique.mockResolvedValue({
      name: 'Calle',
      letterGuidanceDefault: 'Keep it concise',
    })

    const response = await GET()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        name: 'Calle',
        letterGuidanceDefault: 'Keep it concise',
      },
    })
  })

  it('updates default letter guidance', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.update.mockResolvedValue({
      name: null,
      letterGuidanceDefault: 'Mention warehouse safety',
    })

    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ letterGuidanceDefault: 'Mention warehouse safety' }),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { letterGuidanceDefault: 'Mention warehouse safety' },
      select: {
        name: true,
        letterGuidanceDefault: true,
      },
    })
  })
})
