import crypto from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('db integration (prisma)', () => {
  beforeEach(async () => {
    await prisma.generatedLetter.deleteMany({})
    await prisma.savedJob.deleteMany({})
    await prisma.document.deleteMany({})
    await prisma.usageEvent.deleteMany({})
    await prisma.subscription.deleteMany({})
    await prisma.user.deleteMany({})
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('connects and enforces cascade deletes', async () => {
    const userId = crypto.randomUUID()
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
      },
    })

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        type: 'cv',
      },
    })

    expect(doc.userId).toBe(user.id)

    await prisma.user.delete({ where: { id: user.id } })

    const remainingDocs = await prisma.document.count({ where: { id: doc.id } })
    expect(remainingDocs).toBe(0)
  })
})

