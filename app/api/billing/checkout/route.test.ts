import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  findSubscription: vi.fn(),
  upsertSubscription: vi.fn(),
  stripeCustomersCreate: vi.fn(),
  stripeCheckoutCreate: vi.fn(),
  getPriceId: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: (...args: unknown[]) => mocks.getOrCreateUser(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: mocks.findSubscription,
      upsert: mocks.upsertSubscription,
    },
  },
}))

vi.mock('@/lib/billing/stripe', () => ({
  resolveAppOrigin: (origin: string) => origin,
  getProMonthlyPriceId: () => mocks.getPriceId(),
  getStripe: () => ({
    customers: {
      create: mocks.stripeCustomersCreate,
    },
    checkout: {
      sessions: {
        create: mocks.stripeCheckoutCreate,
      },
    },
  }),
}))

import { POST } from './route'

describe('/api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPriceId.mockReturnValue('price_pro_monthly')
    mocks.findSubscription.mockResolvedValue(null)
    mocks.upsertSubscription.mockResolvedValue({})
    mocks.stripeCustomersCreate.mockResolvedValue({ id: 'cus_123' })
    mocks.stripeCheckoutCreate.mockResolvedValue({ url: 'https://stripe.test/checkout' })
  })

  it('returns 401 when not authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest('http://localhost/api/billing/checkout', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('returns 400 when country is not Sweden', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com', tier: 'FREE', country: null })

    const request = new NextRequest('http://localhost/api/billing/checkout', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled()
  })

  it('returns 409 when subscription is already active', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com', tier: 'PRO', country: 'SE' })
    mocks.findSubscription.mockResolvedValue({ stripeCustomerId: 'cus_123', status: 'active' })

    const request = new NextRequest('http://localhost/api/billing/checkout', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(409)
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled()
  })

  it('starts a checkout session for eligible users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', email: 'u1@example.com', tier: 'FREE', country: 'SE' })

    const request = new NextRequest('http://localhost/api/billing/checkout', { method: 'POST' })
    const response = await POST(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, data: { url: 'https://stripe.test/checkout' } })

    expect(mocks.stripeCustomersCreate).toHaveBeenCalled()
    expect(mocks.upsertSubscription).toHaveBeenCalled()
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_123',
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
      })
    )
  })
})
