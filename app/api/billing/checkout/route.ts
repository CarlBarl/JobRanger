import { NextResponse, type NextRequest } from 'next/server'
import { BillingProvider } from '@/generated/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getProMonthlyPriceId, getStripe, resolveAppOrigin } from '@/lib/billing/stripe'

export const runtime = 'nodejs'

type CheckoutErrorCode =
  | 'UNAUTHORIZED'
  | 'COUNTRY_NOT_ALLOWED'
  | 'ALREADY_PRO'
  | 'BILLING_NOT_CONFIGURED'
  | 'INTERNAL_ERROR'

type CheckoutResponse =
  | { success: true; data: { url: string } }
  | { success: false; error: { code: CheckoutErrorCode; message: string } }

function normalizeCountry(value: string | null | undefined) {
  const trimmed = value?.trim().toUpperCase()
  return trimmed && /^[A-Z]{2}$/.test(trimmed) ? trimmed : null
}

function isActiveLike(status: string) {
  return status === 'active' || status === 'trialing'
}

function isMissingStripeCustomerError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const maybeStripeError = error as {
    code?: string
    param?: string
    message?: string
  }

  if (maybeStripeError.code === 'resource_missing' && maybeStripeError.param === 'customer') {
    return true
  }

  return typeof maybeStripeError.message === 'string' && maybeStripeError.message.includes('No such customer')
}

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return NextResponse.json<CheckoutResponse>(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const rateLimit = await consumeRateLimit('billing-checkout', authUser.id, 10, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse('Upgrade attempts limit reached. Please try again later.', rateLimit.retryAfterSeconds)
  }

  const appUser = await getOrCreateUser(authUser.id, authUser.email)
  const country = normalizeCountry(appUser.country)

  if (country !== 'SE') {
    return NextResponse.json<CheckoutResponse>(
      {
        success: false,
        error: {
          code: 'COUNTRY_NOT_ALLOWED',
          message: 'Pro is available only in Sweden right now. Update your country to Sweden in Settings.',
        },
      },
      { status: 400 }
    )
  }

  const origin = resolveAppOrigin(request.nextUrl.origin)

  let stripeCustomerId: string | null = null

  try {
    const existing = await prisma.subscription.findUnique({
      where: {
        userId_provider: { userId: appUser.id, provider: BillingProvider.STRIPE },
      },
      select: { stripeCustomerId: true, status: true },
    })

    if (existing?.stripeCustomerId) {
      stripeCustomerId = existing.stripeCustomerId
      if (isActiveLike(existing.status)) {
        return NextResponse.json<CheckoutResponse>(
          {
            success: false,
            error: { code: 'ALREADY_PRO', message: 'Your subscription is already active.' },
          },
          { status: 409 }
        )
      }
    }

    const stripe = getStripe()
    const priceId = getProMonthlyPriceId()

    async function createAndPersistCustomer() {
      const customer = await stripe.customers.create({
        email: authUser.email,
        metadata: { userId: appUser.id },
      })

      stripeCustomerId = customer.id

      await prisma.subscription.upsert({
        where: { userId_provider: { userId: appUser.id, provider: BillingProvider.STRIPE } },
        update: {
          stripeCustomerId,
          status: 'pending',
          priceId,
        },
        create: {
          userId: appUser.id,
          provider: BillingProvider.STRIPE,
          stripeCustomerId,
          status: 'pending',
          priceId,
        },
      })

      return stripeCustomerId
    }

    if (!stripeCustomerId) {
      await createAndPersistCustomer()
    }

    const checkoutPayload = {
      mode: 'subscription' as const,
      customer: stripeCustomerId,
      client_reference_id: appUser.id,
      metadata: { userId: appUser.id },
      subscription_data: {
        metadata: { userId: appUser.id },
      },
      billing_address_collection: 'required' as const,
      customer_update: {
        address: 'auto' as const,
      },
      consent_collection: {
        terms_of_service: 'required' as const,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      locale: 'auto' as const,
    }

    let session
    try {
      session = await stripe.checkout.sessions.create(checkoutPayload)
    } catch (error) {
      if (!stripeCustomerId || !isMissingStripeCustomerError(error)) {
        throw error
      }

      await createAndPersistCustomer()
      session = await stripe.checkout.sessions.create({
        ...checkoutPayload,
        customer: stripeCustomerId,
      })
    }

    if (!session.url) {
      return NextResponse.json<CheckoutResponse>(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to start checkout' },
        },
        { status: 500 }
      )
    }

    return NextResponse.json<CheckoutResponse>({
      success: true,
      data: { url: session.url },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('STRIPE_') || message.includes('price')) {
      return NextResponse.json<CheckoutResponse>(
        {
          success: false,
          error: { code: 'BILLING_NOT_CONFIGURED', message: 'Billing is not configured.' },
        },
        { status: 500 }
      )
    }

    console.error('Billing checkout error:', message)
    return NextResponse.json<CheckoutResponse>(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to start checkout.' },
      },
      { status: 500 }
    )
  }
}
