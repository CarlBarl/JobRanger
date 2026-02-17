import { NextResponse, type NextRequest } from 'next/server'
import { BillingProvider } from '@/generated/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getStripe, resolveAppOrigin } from '@/lib/billing/stripe'

export const runtime = 'nodejs'

type PortalErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'BILLING_NOT_CONFIGURED' | 'INTERNAL_ERROR'

type PortalResponse =
  | { success: true; data: { url: string } }
  | { success: false; error: { code: PortalErrorCode; message: string } }

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.id) {
    return NextResponse.json<PortalResponse>(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const rateLimit = await consumeRateLimit('billing-portal', authUser.id, 20, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return rateLimitResponse('Billing portal limit reached. Please try again later.', rateLimit.retryAfterSeconds)
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId_provider: { userId: authUser.id, provider: BillingProvider.STRIPE } },
      select: { stripeCustomerId: true },
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json<PortalResponse>(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No subscription found for this account.' },
        },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    const origin = resolveAppOrigin(request.nextUrl.origin)

    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json<PortalResponse>({
      success: true,
      data: { url: portal.url },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('STRIPE_')) {
      return NextResponse.json<PortalResponse>(
        {
          success: false,
          error: { code: 'BILLING_NOT_CONFIGURED', message: 'Billing is not configured.' },
        },
        { status: 500 }
      )
    }

    console.error('Billing portal error:', message)
    return NextResponse.json<PortalResponse>(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to open billing portal.' } },
      { status: 500 }
    )
  }
}
