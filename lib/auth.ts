import { Prisma, prisma } from '@/lib/prisma'

export async function getOrCreateUser(authId: string, email: string) {
  try {
    return await prisma.user.upsert({
      where: { id: authId },
      update: { email },
      create: {
        id: authId,
        email,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Email already exists with a different auth ID.
      // This happens when a user re-registers or their Supabase auth ID changes.
      // Link the existing record to the new auth ID.
      if (error.code === 'P2002') {
        return await prisma.user.update({
          where: { email },
          data: { id: authId },
        })
      }

      // P2022: DB schema mismatch (new columns not yet migrated).
      if (error.code === 'P2022') {
        console.error('Prisma P2022 in getOrCreateUser (DB schema mismatch)', {
          meta: error.meta,
          clientVersion: error.clientVersion,
        })
      }
    }

    throw error
  }
}
