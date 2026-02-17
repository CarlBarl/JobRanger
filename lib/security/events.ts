import {
  Prisma,
  SecurityEventCategory,
  SecurityEventSeverity,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { securityErrorLog } from '@/lib/security/logging'

type SecurityEventInput = {
  category: SecurityEventCategory
  eventType: string
  severity?: SecurityEventSeverity
  actorUserId?: string | null
  targetUserId?: string | null
  requestId?: string | null
  ipAddress?: string | null
  message?: string | null
  metadata?: Prisma.InputJsonValue
}

export async function recordSecurityEvent(input: SecurityEventInput) {
  try {
    await prisma.securityEvent.create({
      data: {
        category: input.category,
        severity: input.severity ?? SecurityEventSeverity.INFO,
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        requestId: input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
        message: input.message ?? null,
        metadata: input.metadata,
      },
    })
  } catch (error) {
    securityErrorLog('security_event.persist_failed', error, {
      category: input.category,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
    })
  }
}

export { SecurityEventCategory, SecurityEventSeverity }
