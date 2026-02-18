import { BillingProvider, Prisma } from '@/generated/prisma/client'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export async function shouldProcessEvent(event: Stripe.Event) {
  try {
    await prisma.billingEvent.create({
      data: {
        provider: BillingProvider.STRIPE,
        eventId: event.id,
        type: event.type,
      },
    })
    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.billingEvent.findUnique({
        where: { eventId: event.id },
        select: { processedAt: true },
      })
      return !existing?.processedAt
    }

    throw error
  }
}

export async function markEventProcessed(eventId: string) {
  await prisma.billingEvent.update({
    where: { eventId },
    data: { processedAt: new Date() },
  })
}
