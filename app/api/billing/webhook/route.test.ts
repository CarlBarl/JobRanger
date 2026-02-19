import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  stripeConstructEvent: vi.fn(),
  stripeRetrieveSubscription: vi.fn(),
  stripeCancelSubscription: vi.fn(),
  billingEventCreate: vi.fn(),
  billingEventUpdate: vi.fn(),
  subscriptionFindFirst: vi.fn(),
  subscriptionUpsert: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
}))

vi.mock('@/lib/billing/stripe', () => ({
  getStripeWebhookSecret: () => 'whsec_test',
  getAllowedStripePriceIds: () => ['price_1'],
  getStripe: () => ({
    webhooks: {
      constructEvent: mocks.stripeConstructEvent,
    },
    subscriptions: {
      retrieve: mocks.stripeRetrieveSubscription,
      cancel: mocks.stripeCancelSubscription,
    },
  }),
}))

vi.mock('@/lib/security/events', () => ({
  recordSecurityEvent: vi.fn(),
  SecurityEventCategory: {
    BILLING: 'BILLING',
  },
  SecurityEventSeverity: {
    WARN: 'WARN',
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    billingEvent: {
      create: mocks.billingEventCreate,
      update: mocks.billingEventUpdate,
    },
    subscription: {
      findFirst: mocks.subscriptionFindFirst,
      upsert: mocks.subscriptionUpsert,
    },
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}))

import { POST } from './route'

describe('/api/billing/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.billingEventCreate.mockResolvedValue({})
    mocks.billingEventUpdate.mockResolvedValue({})
    mocks.subscriptionUpsert.mockResolvedValue({})
    mocks.userFindUnique.mockResolvedValue({ tier: 'FREE' })
    mocks.userUpdate.mockResolvedValue({})
  })

  it('returns 400 when signature header is missing', async () => {
    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      body: '{}',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('syncs subscription and sets PRO on checkout completion (SE)', async () => {
    mocks.stripeConstructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'u1',
          subscription: 'sub_1',
          customer_details: {
            address: { country: 'SE' },
          },
          metadata: {},
        },
      },
    })

    mocks.stripeRetrieveSubscription.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: 1730000000,
      customer: 'cus_1',
      items: { data: [{ price: { id: 'price_1' } }] },
    })

    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: '{}',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    expect(mocks.subscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_provider: { userId: 'u1', provider: 'STRIPE' },
        },
        create: expect.objectContaining({
          userId: 'u1',
          stripeCustomerId: 'cus_1',
          stripeSubscriptionId: 'sub_1',
          status: 'active',
          cancelAtPeriodEnd: false,
        }),
      })
    )

    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          tier: 'PRO',
          proActivatedAt: expect.any(Date),
          proOnboardingDismissedAt: null,
          proOnboardingCompletedAt: null,
          proOnboardingCvStudioVisitedAt: null,
        }),
      })
    )
  })

  it('cancels and downgrades when checkout completes with non-SE country', async () => {
    mocks.stripeConstructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'u2',
          subscription: 'sub_2',
          customer_details: {
            address: { country: 'US' },
          },
          metadata: {},
        },
      },
    })

    mocks.stripeRetrieveSubscription.mockResolvedValue({
      id: 'sub_2',
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: 1730000000,
      customer: 'cus_2',
      items: { data: [{ price: { id: 'price_1' } }] },
    })

    mocks.stripeCancelSubscription.mockResolvedValue({
      id: 'sub_2',
      status: 'canceled',
      cancel_at_period_end: false,
      current_period_end: 1730000000,
      customer: 'cus_2',
      items: { data: [{ price: { id: 'price_1' } }] },
    })

    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: '{}',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    expect(mocks.stripeCancelSubscription).toHaveBeenCalledWith('sub_2')
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        data: expect.objectContaining({ tier: 'FREE' }),
      })
    )
  })

  it('cancels and downgrades when checkout uses disallowed price', async () => {
    mocks.stripeConstructEvent.mockReturnValue({
      id: 'evt_3',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'u3',
          subscription: 'sub_3',
          customer_details: {
            address: { country: 'SE' },
          },
          metadata: {},
        },
      },
    })

    mocks.stripeRetrieveSubscription.mockResolvedValue({
      id: 'sub_3',
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: 1730000000,
      customer: 'cus_3',
      items: { data: [{ price: { id: 'price_disallowed' } }] },
    })

    mocks.stripeCancelSubscription.mockResolvedValue({
      id: 'sub_3',
      status: 'canceled',
      cancel_at_period_end: false,
      current_period_end: 1730000000,
      customer: 'cus_3',
      items: { data: [{ price: { id: 'price_disallowed' } }] },
    })

    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: '{}',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    expect(mocks.stripeCancelSubscription).toHaveBeenCalledWith('sub_3')
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u3' },
        data: expect.objectContaining({ tier: 'FREE' }),
      })
    )
  })
})
