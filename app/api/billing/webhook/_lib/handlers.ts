import type Stripe from 'stripe'
import {
  recordSecurityEvent,
  SecurityEventCategory,
  SecurityEventSeverity,
} from '@/lib/security/events'
import {
  getSubscriptionCurrentPeriodEnd,
  getSubscriptionCustomerId,
  getSubscriptionPriceId,
  isAllowedPrice,
  normalizeCountry,
} from './stripe-normalizers'
import { resolveUserIdFromCustomer, syncSubscription } from './subscription-store'

type HandlerContext = {
  event: Stripe.Event
  stripe: Stripe
  allowedPriceIds: Set<string>
  requestId: string
}

export async function handleCheckoutSessionCompleted({
  event,
  stripe,
  allowedPriceIds,
  requestId,
}: HandlerContext) {
  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.client_reference_id || session.metadata?.userId
  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null

  if (!userId || !stripeSubscriptionId) {
    return
  }

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const priceId = getSubscriptionPriceId(subscription)
  const stripeCustomerId = getSubscriptionCustomerId(subscription)

  if (!stripeCustomerId) {
    return
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
    return
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
}

export async function handleSubscriptionEvent({
  event,
  stripe,
  allowedPriceIds,
  requestId,
}: HandlerContext) {
  const subscription = event.data.object as Stripe.Subscription
  const stripeCustomerId = getSubscriptionCustomerId(subscription)

  if (!stripeCustomerId) {
    return
  }

  const userId = subscription.metadata?.userId || (await resolveUserIdFromCustomer(stripeCustomerId))
  if (!userId) {
    return
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
      return
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
    return
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
}
