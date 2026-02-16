import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  findFirst: vi.fn(),
  generateCvFeedback: vi.fn(),
  enforceMonthlyQuota: vi.fn(),
  recordUsageEvent: vi.fn(),
  resolveCvJobTargets: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: (...args: unknown[]) => mocks.getOrCreateUser(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: mocks.findFirst,
    },
  },
}))

vi.mock('@/lib/services/gemini', () => ({
  CV_STUDIO_MODEL: 'gemini-3-flash-preview',
  generateCvFeedback: (...args: unknown[]) => mocks.generateCvFeedback(...args),
}))

vi.mock('@/lib/security/monthly-quota', () => ({
  USAGE_EVENT_TYPES: {
    CV_FEEDBACK: 'CV_FEEDBACK',
  },
  enforceMonthlyQuota: (...args: unknown[]) => mocks.enforceMonthlyQuota(...args),
  recordUsageEvent: (...args: unknown[]) => mocks.recordUsageEvent(...args),
}))

vi.mock('@/app/api/cv/_lib/job-targets', () => ({
  resolveCvJobTargets: (...args: unknown[]) => mocks.resolveCvJobTargets(...args),
}))

import { POST } from './route'

describe('POST /api/cv-feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.enforceMonthlyQuota.mockResolvedValue(null)
    mocks.recordUsageEvent.mockResolvedValue(undefined)
    mocks.resolveCvJobTargets.mockResolvedValue({
      targets: [],
      warnings: [],
      selectedCount: 0,
    })
    mocks.generateCvFeedback.mockResolvedValue({
      overallSummary: 'summary',
      strengths: ['clear timeline'],
      improvements: [],
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/cv-feedback', {
      method: 'POST',
      body: JSON.stringify({ cvDocumentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 403 for non-pro users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE' })

    const req = new NextRequest('http://localhost/api/cv-feedback', {
      method: 'POST',
      body: JSON.stringify({ cvDocumentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    })
  })

  it('returns 404 when cv is not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'PRO' })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/cv-feedback', {
      method: 'POST',
      body: JSON.stringify({ cvDocumentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('returns feedback for pro users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'PRO' })
    mocks.findFirst.mockResolvedValue({ id: 'doc-1', parsedContent: 'cv text' })
    mocks.resolveCvJobTargets.mockResolvedValue({
      targets: [
        {
          afJobId: '123',
          jobTitle: 'Warehouse Operator',
          jobDescription: 'Pick and pack',
          companyName: 'ACME',
        },
      ],
      warnings: ['Could not load job description for saved job 124.'],
      selectedCount: 2,
    })

    const req = new NextRequest('http://localhost/api/cv-feedback', {
      method: 'POST',
      body: JSON.stringify({
        cvDocumentId: 'doc-1',
        selectedJobIds: ['123', '124'],
        directiveText: 'Focus on logistics roles',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: {
        feedback: {
          overallSummary: 'summary',
          strengths: ['clear timeline'],
          improvements: [],
        },
        targeted: true,
        usedJobCount: 1,
        selectedJobCount: 2,
        warnings: ['Could not load job description for saved job 124.'],
        model: 'gemini-3-flash-preview',
      },
    })

    expect(mocks.generateCvFeedback).toHaveBeenCalledWith({
      cvContent: 'cv text',
      directiveText: 'Focus on logistics roles',
      jobTargets: [
        {
          afJobId: '123',
          jobTitle: 'Warehouse Operator',
          jobDescription: 'Pick and pack',
          companyName: 'ACME',
        },
      ],
    })
    expect(mocks.recordUsageEvent).toHaveBeenCalledWith('u1', 'CV_FEEDBACK')
  })
})
