import { prisma } from '@/lib/prisma'

export async function getOrCreateUser(authId: string, email: string) {
  return prisma.user.upsert({
    where: { id: authId },
    update: { email },
    create: {
      id: authId,
      email,
    },
  })
}
