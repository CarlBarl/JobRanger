import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  getJobById: vi.fn(),
  generateCoverLetter: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  enforceMonthlyQuota: vi.fn(),
  recordUsageEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: mocks.getOrCreateUser,
}))

vi.mock('@/lib/services/arbetsformedlingen', () => ({
  getJobById: mocks.getJobById,
}))

vi.mock('@/lib/services/gemini', () => ({
  generateCoverLetter: mocks.generateCoverLetter,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { updateMany: mocks.updateMany },
    document: { findFirst: mocks.findFirst },
    savedJob: { findUnique: mocks.findUnique },
    generatedLetter: { create: mocks.create },
  },
}))

vi.mock('@/lib/security/monthly-quota', () => ({
  enforceMonthlyQuota: (...args: unknown[]) => mocks.enforceMonthlyQuota(...args),
  recordUsageEvent: (...args: unknown[]) => mocks.recordUsageEvent(...args),
}))

import { POST } from './route'

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.enforceMonthlyQuota.mockResolvedValue(null)
    mocks.recordUsageEvent.mockResolvedValue(undefined)
    mocks.updateMany.mockResolvedValue({ count: 0 })
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ afJobId: '123', documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when CV document not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE' })
    mocks.getJobById.mockResolvedValue({ id: '123', headline: 'Dev', description: { text: 'desc' } })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ afJobId: '123', documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('generates and stores a letter', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE' })
    mocks.getJobById.mockResolvedValue({
      id: '123',
      headline: 'Dev',
      employer: { name: 'ACME' },
      description: { text: 'desc' },
    })
    // First call returns CV, second call returns personal letter
    mocks.findFirst
      .mockResolvedValueOnce({ id: 'doc-1', parsedContent: 'cv text' })
      .mockResolvedValueOnce({ id: 'pl-1', parsedContent: 'personal letter text' })
    mocks.generateCoverLetter.mockResolvedValue('letter')
    mocks.findUnique.mockResolvedValue({ id: 'saved-1' })
    mocks.create.mockResolvedValue({ id: 'letter-1', content: 'letter', createdAt: 'now' })

    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ afJobId: '123', documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { id: 'letter-1', content: 'letter', createdAt: 'now', guideBonusApplied: false },
    })

    expect(mocks.generateCoverLetter).toHaveBeenCalledWith({
      cvContent: 'cv text',
      jobTitle: 'Dev',
      jobDescription: 'desc',
      companyName: 'ACME',
      personalLetterContent: 'personal letter text',
      userGuidance: undefined,
    })
    expect(mocks.create).toHaveBeenCalled()
    expect(mocks.recordUsageEvent).toHaveBeenCalledWith('u1', 'GENERATE_LETTER')
  })

  it('uses guidance override when provided', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE', letterGuidanceDefault: 'default' })
    mocks.getJobById.mockResolvedValue({
      id: '123',
      headline: 'Dev',
      employer: { name: 'ACME' },
      description: { text: 'desc' },
    })
    mocks.findFirst
      .mockResolvedValueOnce({ id: 'doc-1', parsedContent: 'cv text' })
      .mockResolvedValueOnce(null)
    mocks.generateCoverLetter.mockResolvedValue('letter')
    mocks.findUnique.mockResolvedValue(null)
    mocks.create.mockResolvedValue({ id: 'letter-2', content: 'letter', createdAt: 'now' })

    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        afJobId: '123',
        documentId: 'doc-1',
        guidanceOverride: 'Focus on logistics and shift flexibility',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mocks.generateCoverLetter).toHaveBeenCalledWith(
      expect.objectContaining({
        userGuidance: 'Focus on logistics and shift flexibility',
      })
    )
  })

  it('allows blank guidance override', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE', letterGuidanceDefault: null })
    mocks.getJobById.mockResolvedValue({
      id: '123',
      headline: 'Dev',
      employer: { name: 'ACME' },
      description: { text: 'desc' },
    })
    mocks.findFirst
      .mockResolvedValueOnce({ id: 'doc-1', parsedContent: 'cv text' })
      .mockResolvedValueOnce(null)
    mocks.generateCoverLetter.mockResolvedValue('letter')
    mocks.findUnique.mockResolvedValue(null)
    mocks.create.mockResolvedValue({ id: 'letter-3', content: 'letter', createdAt: 'now' })

    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        afJobId: '123',
        documentId: 'doc-1',
        guidanceOverride: '   ',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mocks.generateCoverLetter).toHaveBeenCalledWith(
      expect.objectContaining({
        userGuidance: undefined,
      })
    )
  })

  it('returns 429 when monthly quota is exceeded', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE' })
    mocks.enforceMonthlyQuota.mockResolvedValue(
      NextResponse.json(
        {
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: 'Monthly letter generation quota reached for your plan.' },
        },
        { status: 429 }
      )
    )

    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ afJobId: '123', documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'QUOTA_EXCEEDED' },
    })
  })

  it('applies guide bonus generation and skips monthly quota + usage event', async () => {
    const startedAt = new Date()

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({
      id: 'u1',
      tier: 'FREE',
      dashboardGuideLastStartedAt: startedAt,
      dashboardGuideBonusGenerateLetterUsedAt: null,
    })
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.getJobById.mockResolvedValue({
      id: '123',
      headline: 'Dev',
      employer: { name: 'ACME' },
      description: { text: 'desc' },
    })
    mocks.findFirst
      .mockResolvedValueOnce({ id: 'doc-1', parsedContent: 'cv text' })
      .mockResolvedValueOnce(null)
    mocks.generateCoverLetter.mockResolvedValue('letter')
    mocks.findUnique.mockResolvedValue({ id: 'saved-1' })
    mocks.create.mockResolvedValue({ id: 'letter-1', content: 'letter', createdAt: 'now' })

    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ afJobId: '123', documentId: 'doc-1', guideBonus: true }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { id: 'letter-1', content: 'letter', createdAt: 'now', guideBonusApplied: true },
    })

    expect(mocks.enforceMonthlyQuota).not.toHaveBeenCalled()
    expect(mocks.recordUsageEvent).not.toHaveBeenCalled()
    expect(mocks.updateMany).toHaveBeenCalled()
  })
})

