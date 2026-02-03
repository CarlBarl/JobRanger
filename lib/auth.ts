import { prisma } from '@/lib/prisma'

export async function getOrCreateUser(authId: string, email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: authId,
      email,
    },
  })
}

