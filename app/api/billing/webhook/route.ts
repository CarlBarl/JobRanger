import { NextResponse } from 'next/server'
import { BillingProvider, Prisma, UserTier } from '@prisma/client'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import {
  getAllowedStripePriceIds,
  getStripe,
  getStripeWebhookSecret,
} from '@/lib/billing/stripe'
import {
  recordSecurityEvent,
  SecurityEventCategory,
  SecurityEventSeverity,
} from '@/lib/security/events'
import { resolveRequestId } from '@/lib/security/logging'

export const runtime = 'nodejs'

function normalizeCountry(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  return trimmed && /^[A-Z]{2}$/.test(trimmed) ? trimmed : null
}

function isProStatus(status: string) {
  return status === 'active' || status === 'trialing'
}

async function shouldProcessEvent(event: Stripe.Event) {
  try {
    await prisma.billingEvent.create({
      data: {
        provider: BillingProvider.STRIPE,
        eventId: event.id,
        type: event.type,
      },
    })
    return true
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.billingEvent.findUnique({
        where: { eventId: event.id },
        select: { processedAt: true },
      })
      return !existing?.processedAt
    }

    throw error
  }
}

async function resolveUserIdFromCustomer(stripeCustomerId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId, provider: BillingProvider.STRIPE },
    select: { userId: true },
  })
  return subscription?.userId ?? null
}

async function syncSubscription({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  priceId,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: string
  priceId: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}) {
  const tier = isProStatus(status) ? UserTier.PRO : UserTier.FREE

  await prisma.subscription.upsert({
    where: {
      userId_provider: { userId, provider: BillingProvider.STRIPE },
    },
    update: {
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      priceId: priceId ?? undefined,
      currentPeriodEnd: currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd,
    },
    create: {
      userId,
      provider: BillingProvider.STRIPE,
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      priceId: priceId ?? undefined,
      currentPeriodEnd: currentPeriodEnd ?? undefined,
      cancelAtPeriodEnd,
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { tier },
  })
}

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0]
  const price = item?.price
  return typeof price?.id === 'string' ? price.id : null
}

function getSubscriptionCustomerId(subscription: Stripe.Subscription): string | null {
  const customer = subscription.customer
  if (typeof customer === 'string') return customer
  return typeof customer?.id === 'string' ? customer.id : null
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value) => typeof value === 'number' && Number.isFinite(value))

  if (ends.length === 0) return null
  return new Date(Math.max(...ends) * 1000)
}

function isLiveSecretKeyMode() {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  return key.startsWith('sk_live_')
}

function isAllowedPrice(priceId: string | null, allowedPriceIds: Set<string>) {
  if (!priceId) return false
  return allowedPriceIds.has(priceId)
}

async function markEventProcessed(eventId: string) {
  await prisma.billingEvent.update({
    where: { eventId },
    data: { processedAt: new Date() },
  })
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request)
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  let event: Stripe.Event
  const payload = await request.text()

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Stripe webhook signature error:', message)
    return NextResponse.json({ received: false }, { status: 400 })
  }

  try {
    const process = await shouldProcessEvent(event)
    if (!process) {
      return NextResponse.json({ received: true })
    }
  } catch (error) {
    console.error('Stripe webhook event store error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ received: false }, { status: 500 })
  }

  try {
    const stripe = getStripe()
    const allowedPriceIds = new Set(getAllowedStripePriceIds())

    if (
      typeof event.livemode === 'boolean' &&
      event.livemode !== isLiveSecretKeyMode()
    ) {
      await recordSecurityEvent({
        category: SecurityEventCategory.BILLING,
        severity: SecurityEventSeverity.WARN,
        eventType: 'billing.webhook.mode_mismatch',
        requestId,
        message: 'Stripe livemode does not match configured secret key mode',
        metadata: { eventId: event.id, eventType: event.type, livemode: event.livemode },
      })
      await markEventProcessed(event.id)
      return NextResponse.json({ received: true })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id || session.metadata?.userId
      const stripeSubscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null

      if (!userId || !stripeSubscriptionId) {
        await prisma.billingEvent.update({
          where: { eventId: event.id },
          data: { processedAt: new Date() },
        })
        return NextResponse.json({ received: true })
      }

      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      const priceId = getSubscriptionPriceId(subscription)

      const stripeCustomerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null

      if (!stripeCustomerId) {
        await markEventProcessed(event.id)
        return NextResponse.json({ received: true })
      }

      const checkoutCountry = normalizeCountry(session.customer_details?.address?.country)
      const priceAllowed = isAllowedPrice(priceId, allowedPriceIds)

      if ((checkoutCountry && checkoutCountry !== 'SE') || !priceAllowed) {
        const canceled = await stripe.subscriptions.cancel(stripeSubscriptionId)

        if (!priceAllowed) {
          await recordSecurityEvent({
            category: SecurityEventCategory.BILLING,
            severity: SecurityEventSeverity.WARN,
            eventType: 'billing.webhook.disallowed_price',
            actorUserId: userId,
            requestId,
            message: 'Subscription canceled because price is not in allowlist',
            metadata: {
              eventId: event.id,
              stripeSubscriptionId,
              priceId,
              allowedPriceIds: Array.from(allowedPriceIds),
            },
          })
        }

        await syncSubscription({
          userId,
          stripeCustomerId,
          stripeSubscriptionId: canceled.id,
          status: canceled.status,
          priceId: getSubscriptionPriceId(canceled),
          currentPeriodEnd: getSubscriptionCurrentPeriodEnd(canceled),
          cancelAtPeriodEnd: canceled.cancel_at_period_end,
        })

        await markEventProcessed(event.id)
        return NextResponse.json({ received: true })
      }

      await syncSubscription({
        userId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        priceId,
        currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })

      await markEventProcessed(event.id)

      return NextResponse.json({ received: true })
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const stripeCustomerId = getSubscriptionCustomerId(subscription)

      if (!stripeCustomerId) {
        await markEventProcessed(event.id)
        return NextResponse.json({ received: true })
      }

      const userId = subscription.metadata?.userId || (await resolveUserIdFromCustomer(stripeCustomerId))
      if (!userId) {
        await markEventProcessed(event.id)
        return NextResponse.json({ received: true })
      }

      const priceId = getSubscriptionPriceId(subscription)
      if (!isAllowedPrice(priceId, allowedPriceIds)) {
        await recordSecurityEvent({
          category: SecurityEventCategory.BILLING,
          severity: SecurityEventSeverity.WARN,
          eventType: 'billing.webhook.disallowed_price',
          actorUserId: userId,
          requestId,
          message: 'Subscription update ignored because price is not in allowlist',
          metadata: {
            eventId: event.id,
            stripeSubscriptionId: subscription.id,
            priceId,
            allowedPriceIds: Array.from(allowedPriceIds),
          },
        })

        if (subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') {
          const canceled = await stripe.subscriptions.cancel(subscription.id)
          await syncSubscription({
            userId,
            stripeCustomerId,
            stripeSubscriptionId: canceled.id,
            status: canceled.status,
            priceId: getSubscriptionPriceId(canceled),
            currentPeriodEnd: getSubscriptionCurrentPeriodEnd(canceled),
            cancelAtPeriodEnd: canceled.cancel_at_period_end,
          })
        } else {
          await syncSubscription({
            userId,
            stripeCustomerId,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            priceId,
            currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          })
        }

        await markEventProcessed(event.id)
        return NextResponse.json({ received: true })
      }

      await syncSubscription({
        userId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        priceId,
        currentPeriodEnd: getSubscriptionCurrentPeriodEnd(subscription),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })

      await markEventProcessed(event.id)

      return NextResponse.json({ received: true })
    }

    // Ignore all other event types.
    await markEventProcessed(event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook processing error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}
