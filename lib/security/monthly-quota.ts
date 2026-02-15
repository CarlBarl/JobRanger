import { NextResponse } from 'next/server'
import { UserTier, UsageEventType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const MONTHLY_AI_QUOTAS: Record<UserTier, Record<UsageEventType, number>> = {
  [UserTier.FREE]: {
    [UsageEventType.GENERATE_LETTER]: 1,
    [UsageEventType.SKILLS_EXTRACT]: 3,
    [UsageEventType.SKILLS_BATCH]: 1,
  },
  [UserTier.PRO]: {
    [UsageEventType.GENERATE_LETTER]: 200,
    [UsageEventType.SKILLS_EXTRACT]: 300,
    [UsageEventType.SKILLS_BATCH]: 50,
  },
}

type MonthlyWindow = {
  startAt: Date
  resetAt: Date
}

type MonthlyQuotaParams = {
  userId: string
  userTier: UserTier
  usageType: UsageEventType
  message: string
  now?: Date
}

function getMonthWindow(now = new Date()): MonthlyWindow {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  return {
    startAt: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    resetAt: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)),
  }
}

function secondsUntil(date: Date, from = new Date()) {
  return Math.max(1, Math.ceil((date.getTime() - from.getTime()) / 1000))
}

export function getMonthlyQuotaLimit(userTier: UserTier, usageType: UsageEventType) {
  return MONTHLY_AI_QUOTAS[userTier][usageType]
}

export async function enforceMonthlyQuota({
  userId,
  userTier,
  usageType,
  message,
  now = new Date(),
}: MonthlyQuotaParams): Promise<NextResponse | null> {
  const { startAt, resetAt } = getMonthWindow(now)
  const limit = getMonthlyQuotaLimit(userTier, usageType)

  const used = await prisma.usageEvent.count({
    where: {
      userId,
      type: usageType,
      createdAt: {
        gte: startAt,
        lt: resetAt,
      },
    },
  })

  if (used < limit) {
    return null
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message,
        limit,
        used,
        window: 'monthly',
        resetAt: resetAt.toISOString(),
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(secondsUntil(resetAt, now)),
      },
    }
  )
}

export async function recordUsageEvent(userId: string, usageType: UsageEventType) {
  await prisma.usageEvent.create({
    data: {
      userId,
      type: usageType,
    },
  })
}
