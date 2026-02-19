import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  usageCount: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    usageEvent: {
      count: mocks.usageCount,
    },
  },
}))

import { GET, POST } from './route'

describe('/api/user/guides', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.usageCount.mockResolvedValue(0)
  })

  it('returns 401 when guide state is requested unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest('http://localhost/api/user/guides')
    const response = await GET(request)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns serialized guide state when authenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findUnique.mockResolvedValue({
      id: 'u1',
      tier: 'FREE',
      dashboardGuidePromptedAt: new Date('2026-02-01T10:00:00.000Z'),
      dashboardGuideCompletedAt: null,
      dashboardGuideDismissedAt: null,
      onboardingGuideResetAt: null,
      onboardingGuideLastCompletedAt: new Date('2026-02-01T11:00:00.000Z'),
      onboardingCompleted: true,
      proActivatedAt: null,
      proOnboardingDismissedAt: null,
      proOnboardingCompletedAt: null,
      proOnboardingCvStudioVisitedAt: null,
    })

    const request = new NextRequest('http://localhost/api/user/guides')
    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        dashboardGuidePromptedAt: '2026-02-01T10:00:00.000Z',
        dashboardGuideCompletedAt: null,
        dashboardGuideDismissedAt: null,
        onboardingGuideResetAt: null,
        onboardingGuideLastCompletedAt: '2026-02-01T11:00:00.000Z',
        onboardingCompleted: true,
        proActivatedAt: null,
        proOnboardingDismissedAt: null,
        proOnboardingCompletedAt: null,
        proOnboardingCvStudioVisitedAt: null,
        proOnboarding: {
          isEligible: false,
          isCompleted: false,
          isDismissed: false,
          completedSteps: 0,
          totalSteps: 3,
          nextStepId: 'complete',
          nextHref: '/dashboard',
          steps: {
            visitCvStudio: false,
            useCvAi: false,
            generateLetter: false,
          },
        },
      },
    })
  })

  it('returns 400 for invalid update action', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const request = new NextRequest('http://localhost/api/user/guides', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalidAction' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('resets onboarding state when replay action is requested', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.update.mockResolvedValue({
      id: 'u1',
      tier: 'FREE',
      dashboardGuidePromptedAt: null,
      dashboardGuideCompletedAt: null,
      dashboardGuideDismissedAt: null,
      onboardingGuideResetAt: new Date('2026-02-02T09:00:00.000Z'),
      onboardingGuideLastCompletedAt: new Date('2026-02-01T11:00:00.000Z'),
      onboardingCompleted: false,
      proActivatedAt: null,
      proOnboardingDismissedAt: null,
      proOnboardingCompletedAt: null,
      proOnboardingCvStudioVisitedAt: null,
    })

    const request = new NextRequest('http://localhost/api/user/guides', {
      method: 'POST',
      body: JSON.stringify({ action: 'restartOnboardingGuide' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          onboardingCompleted: false,
          onboardingGuideResetAt: expect.any(Date),
        }),
      })
    )
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        onboardingCompleted: false,
        proOnboarding: {
          isEligible: false,
          isCompleted: false,
          isDismissed: false,
          completedSteps: 0,
          totalSteps: 3,
          nextStepId: 'complete',
          nextHref: '/dashboard',
          steps: {
            visitCvStudio: false,
            useCvAi: false,
            generateLetter: false,
          },
        },
      },
    })
  })

  it('stores pro onboarding dismissal when requested', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.update.mockResolvedValue({
      id: 'u1',
      tier: 'PRO',
      dashboardGuidePromptedAt: null,
      dashboardGuideCompletedAt: null,
      dashboardGuideDismissedAt: null,
      onboardingGuideResetAt: null,
      onboardingGuideLastCompletedAt: null,
      onboardingCompleted: true,
      proActivatedAt: new Date('2026-02-01T11:00:00.000Z'),
      proOnboardingDismissedAt: new Date('2026-02-01T11:05:00.000Z'),
      proOnboardingCompletedAt: null,
      proOnboardingCvStudioVisitedAt: null,
    })

    const request = new NextRequest('http://localhost/api/user/guides', {
      method: 'POST',
      body: JSON.stringify({ action: 'markProOnboardingDismissed' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          proOnboardingDismissedAt: expect.any(Date),
        }),
      })
    )
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        proOnboardingDismissedAt: '2026-02-01T11:05:00.000Z',
      },
    })
  })
})
