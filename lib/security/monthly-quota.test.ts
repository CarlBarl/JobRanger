import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usageEvent: {
      count: (...args: unknown[]) => mocks.count(...args),
      create: (...args: unknown[]) => mocks.create(...args),
    },
  },
}))

import { enforceMonthlyQuota, getMonthlyQuotaLimit, recordUsageEvent } from './monthly-quota'

describe('monthly quota helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns expected monthly limits per tier and usage type', () => {
    expect(getMonthlyQuotaLimit('FREE', 'GENERATE_LETTER')).toBe(1)
    expect(getMonthlyQuotaLimit('FREE', 'SKILLS_EXTRACT')).toBe(3)
    expect(getMonthlyQuotaLimit('FREE', 'SKILLS_BATCH')).toBe(1)
    expect(getMonthlyQuotaLimit('PRO', 'GENERATE_LETTER')).toBe(200)
    expect(getMonthlyQuotaLimit('PRO', 'SKILLS_EXTRACT')).toBe(300)
    expect(getMonthlyQuotaLimit('PRO', 'SKILLS_BATCH')).toBe(50)
  })

  it('allows request when monthly usage is below limit', async () => {
    mocks.count.mockResolvedValue(0)

    const result = await enforceMonthlyQuota({
      userId: 'u1',
      userTier: 'FREE',
      usageType: 'GENERATE_LETTER',
      message: 'Quota hit',
      now: new Date('2026-02-15T00:00:00.000Z'),
    })

    expect(result).toBeNull()
  })

  it('returns quota response when monthly usage hits limit', async () => {
    mocks.count.mockResolvedValue(1)
    const now = new Date('2026-02-15T00:00:00.000Z')

    const result = await enforceMonthlyQuota({
      userId: 'u1',
      userTier: 'FREE',
      usageType: 'GENERATE_LETTER',
      message: 'Monthly letter generation quota reached for your plan.',
      now,
    })

    expect(result?.status).toBe(429)
    expect(result?.headers.get('Retry-After')).toBe('1209600')
    await expect(result?.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        limit: 1,
        used: 1,
        window: 'monthly',
        resetAt: '2026-03-01T00:00:00.000Z',
      },
    })
  })

  it('records usage events', async () => {
    mocks.create.mockResolvedValue(undefined)

    await recordUsageEvent('u1', 'SKILLS_BATCH')

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        type: 'SKILLS_BATCH',
      },
    })
  })
})
