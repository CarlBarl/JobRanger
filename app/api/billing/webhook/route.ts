import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
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
import { handleCheckoutSessionCompleted, handleSubscriptionEvent } from './_lib/handlers'
import { markEventProcessed, shouldProcessEvent } from './_lib/idempotency'
import { isLiveSecretKeyMode, isSubscriptionEventType } from './_lib/stripe-normalizers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const requestId = resolveRequestId(request)
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  let event: Stripe.Event
  // Stripe signature verification requires the exact raw bytes as received.
  const payload = Buffer.from(await request.arrayBuffer())

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
      await handleCheckoutSessionCompleted({
        event,
        stripe,
        allowedPriceIds,
        requestId,
      })
      await markEventProcessed(event.id)
      return NextResponse.json({ received: true })
    }

    if (isSubscriptionEventType(event.type)) {
      await handleSubscriptionEvent({
        event,
        stripe,
        allowedPriceIds,
        requestId,
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
