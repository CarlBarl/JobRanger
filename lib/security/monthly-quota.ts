import { NextResponse } from 'next/server'
import { UserTier, UsageEventType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AppUsageEventType = UsageEventType | 'CV_FEEDBACK' | 'CV_EDIT'

export const USAGE_EVENT_TYPES = {
  GENERATE_LETTER: 'GENERATE_LETTER' as AppUsageEventType,
  SKILLS_EXTRACT: 'SKILLS_EXTRACT' as AppUsageEventType,
  SKILLS_BATCH: 'SKILLS_BATCH' as AppUsageEventType,
  CV_FEEDBACK: 'CV_FEEDBACK' as AppUsageEventType,
  CV_EDIT: 'CV_EDIT' as AppUsageEventType,
} as const

const MONTHLY_AI_QUOTAS: Record<UserTier, Record<string, number>> = {
  [UserTier.FREE]: {
    [USAGE_EVENT_TYPES.GENERATE_LETTER]: 1,
    [USAGE_EVENT_TYPES.SKILLS_EXTRACT]: 3,
    [USAGE_EVENT_TYPES.SKILLS_BATCH]: 1,
    [USAGE_EVENT_TYPES.CV_FEEDBACK]: 0,
    [USAGE_EVENT_TYPES.CV_EDIT]: 0,
  },
  [UserTier.PRO]: {
    [USAGE_EVENT_TYPES.GENERATE_LETTER]: 200,
    [USAGE_EVENT_TYPES.SKILLS_EXTRACT]: 300,
    [USAGE_EVENT_TYPES.SKILLS_BATCH]: 50,
    [USAGE_EVENT_TYPES.CV_FEEDBACK]: 200,
    [USAGE_EVENT_TYPES.CV_EDIT]: 100,
  },
}

type MonthlyWindow = {
  startAt: Date
  resetAt: Date
}

type MonthlyQuotaParams = {
  userId: string
  userTier: UserTier
  usageType: AppUsageEventType
  message: string
  now?: Date
}

type MonthlyQuotaSnapshotParams = {
  userId: string
  userTier: UserTier
  usageType: AppUsageEventType
  now?: Date
}

export type MonthlyQuotaSnapshot = {
  limit: number
  used: number
  remaining: number
  window: 'monthly'
  resetAt: string
  isExhausted: boolean
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

export function getMonthlyQuotaLimit(userTier: UserTier, usageType: AppUsageEventType) {
  return MONTHLY_AI_QUOTAS[userTier][usageType] ?? 0
}

export async function getMonthlyQuotaSnapshot({
  userId,
  userTier,
  usageType,
  now = new Date(),
}: MonthlyQuotaSnapshotParams): Promise<MonthlyQuotaSnapshot> {
  const { startAt, resetAt } = getMonthWindow(now)
  const limit = getMonthlyQuotaLimit(userTier, usageType)

  const used = await prisma.usageEvent.count({
    where: {
      userId,
      type: usageType as UsageEventType,
      createdAt: {
        gte: startAt,
        lt: resetAt,
      },
    },
  })

  const remaining = Math.max(limit - used, 0)

  return {
    limit,
    used,
    remaining,
    window: 'monthly',
    resetAt: resetAt.toISOString(),
    isExhausted: used >= limit,
  }
}

export async function enforceMonthlyQuota({
  userId,
  userTier,
  usageType,
  message,
  now = new Date(),
}: MonthlyQuotaParams): Promise<NextResponse | null> {
  const snapshot = await getMonthlyQuotaSnapshot({
    userId,
    userTier,
    usageType,
    now,
  })

  if (!snapshot.isExhausted) {
    return null
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message,
        limit: snapshot.limit,
        used: snapshot.used,
        remaining: snapshot.remaining,
        window: snapshot.window,
        resetAt: snapshot.resetAt,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(secondsUntil(new Date(snapshot.resetAt), now)),
      },
    }
  )
}

export async function recordUsageEvent(userId: string, usageType: AppUsageEventType) {
  await prisma.usageEvent.create({
    data: {
      userId,
      type: usageType as UsageEventType,
    },
  })
}
