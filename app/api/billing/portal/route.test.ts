import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findSubscription: vi.fn(),
  stripePortalCreate: vi.fn(),
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
    subscription: {
      findUnique: mocks.findSubscription,
    },
  },
}))

vi.mock('@/lib/billing/stripe', () => ({
  resolveAppOrigin: (origin: string) => origin,
  getStripe: () => ({
    billingPortal: {
      sessions: {
        create: mocks.stripePortalCreate,
      },
    },
  }),
}))

import { POST } from './route'

describe('/api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findSubscription.mockResolvedValue({ stripeCustomerId: 'cus_123' })
    mocks.stripePortalCreate.mockResolvedValue({ url: 'https://stripe.test/portal' })
  })

  it('returns 401 when not authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest('http://localhost/api/billing/portal', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('returns 404 when subscription is missing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findSubscription.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/billing/portal', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(404)
  })

  it('returns portal url for authenticated users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const request = new NextRequest('http://localhost/api/billing/portal', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, data: { url: 'https://stripe.test/portal' } })

    expect(mocks.stripePortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
      })
    )
  })
})

