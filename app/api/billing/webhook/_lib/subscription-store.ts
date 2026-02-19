import { BillingProvider, UserTier } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

function isProStatus(status: string) {
  return status === 'active' || status === 'trialing'
}

export async function resolveUserIdFromCustomer(stripeCustomerId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId, provider: BillingProvider.STRIPE },
    select: { userId: true },
  })
  return subscription?.userId ?? null
}

export async function syncSubscription({
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
  const previousUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  })

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

  const userUpdateData: {
    tier: UserTier
    proActivatedAt?: Date
    proOnboardingDismissedAt?: null
    proOnboardingCompletedAt?: null
    proOnboardingCvStudioVisitedAt?: null
  } = {
    tier,
  }

  if (tier === UserTier.PRO && previousUser?.tier !== UserTier.PRO) {
    userUpdateData.proActivatedAt = new Date()
    userUpdateData.proOnboardingDismissedAt = null
    userUpdateData.proOnboardingCompletedAt = null
    userUpdateData.proOnboardingCvStudioVisitedAt = null
  }

  await prisma.user.update({
    where: { id: userId },
    data: userUpdateData,
  })
}
