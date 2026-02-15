import { UserTier } from '@prisma/client'

const PRO_TIER_EMAIL = 'carlelelid@outlook.com'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function resolveTierFromEmail(email: string): UserTier {
  return normalizeEmail(email) === normalizeEmail(PRO_TIER_EMAIL)
    ? UserTier.PRO
    : UserTier.FREE
}
