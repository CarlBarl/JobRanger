import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  return user?.role ?? null
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === UserRole.ADMIN
}
