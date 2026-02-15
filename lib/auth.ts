import { prisma } from '@/lib/prisma'
import { resolveTierFromEmail } from '@/lib/billing/tier'

export async function getOrCreateUser(authId: string, email: string) {
  const tier = resolveTierFromEmail(email)

  return prisma.user.upsert({
    where: { id: authId },
    update: { email, tier },
    create: {
      id: authId,
      email,
      tier,
    },
  })
}
