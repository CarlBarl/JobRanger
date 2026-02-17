import Stripe from 'stripe'
import { readCsvEnv, requireEnv, requireEnvInProduction } from '@/lib/config/env'

let cachedStripe: Stripe | null = null

export function getStripe() {
  if (cachedStripe) return cachedStripe

  const secretKey = requireEnv('STRIPE_SECRET_KEY')

  cachedStripe = new Stripe(secretKey, {
    typescript: true,
  })

  return cachedStripe
}

export function getStripeWebhookSecret() {
  return requireEnv('STRIPE_WEBHOOK_SECRET')
}

export function getProMonthlyPriceId() {
  return requireEnv('STRIPE_PRICE_ID_PRO_MONTHLY')
}

export function getAllowedStripePriceIds() {
  const configured = readCsvEnv('STRIPE_ALLOWED_PRICE_IDS')
  if (configured.length > 0) return configured

  return [getProMonthlyPriceId()]
}

export function resolveAppOrigin(fallbackOrigin: string) {
  const configured = requireEnvInProduction('NEXT_PUBLIC_APP_URL', fallbackOrigin)

  try {
    return new URL(configured).origin
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_APP_URL must be a valid absolute URL in production')
    }
    return fallbackOrigin
  }
}
