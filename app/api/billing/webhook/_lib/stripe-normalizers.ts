import type Stripe from 'stripe'

export function normalizeCountry(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toUpperCase()
  return trimmed && /^[A-Z]{2}$/.test(trimmed) ? trimmed : null
}

export function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0]
  const price = item?.price
  return typeof price?.id === 'string' ? price.id : null
}

export function getSubscriptionCustomerId(subscription: Stripe.Subscription): string | null {
  const customer = subscription.customer
  if (typeof customer === 'string') return customer
  return typeof customer?.id === 'string' ? customer.id : null
}

export function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value) => typeof value === 'number' && Number.isFinite(value))

  if (ends.length === 0) return null
  return new Date(Math.max(...ends) * 1000)
}

export function isLiveSecretKeyMode() {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  return key.startsWith('sk_live_')
}

export function isAllowedPrice(priceId: string | null, allowedPriceIds: Set<string>) {
  if (!priceId) return false
  return allowedPriceIds.has(priceId)
}

export function isSubscriptionEventType(eventType: Stripe.Event.Type) {
  return (
    eventType === 'customer.subscription.created' ||
    eventType === 'customer.subscription.updated' ||
    eventType === 'customer.subscription.deleted'
  )
}
