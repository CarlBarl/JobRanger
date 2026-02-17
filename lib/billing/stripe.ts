import Stripe from 'stripe'
import { readCsvEnv, readEnv, requireEnv } from '@/lib/config/env'

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
  const configured = readEnv('NEXT_PUBLIC_APP_URL')
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('NEXT_PUBLIC_APP_URL must be a valid absolute URL in production')
      }
      return fallbackOrigin
    }
  }

  const vercelUrl = readEnv('VERCEL_URL')
  if (vercelUrl) {
    const candidate = vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')
      ? vercelUrl
      : `https://${vercelUrl}`

    try {
      return new URL(candidate).origin
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('VERCEL_URL must be a valid host or absolute URL in production')
      }
      return fallbackOrigin
    }
  }

  return fallbackOrigin
}
