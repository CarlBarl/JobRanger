import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
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
      update: mocks.update,
    },
  },
}))

import { PATCH } from './route'

describe('/api/user/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('marks onboarding complete and clears replay reset flag', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.update.mockResolvedValue({ id: 'u1' })

    const request = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    })

    const response = await PATCH(request)
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        onboardingCompleted: true,
        onboardingGuideLastCompletedAt: expect.any(Date),
        onboardingGuideResetAt: null,
      },
    })
    await expect(response.json()).resolves.toEqual({ success: true })
  })
})
