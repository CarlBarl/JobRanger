import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  rewriteCvWithChangelog: vi.fn(),
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
      create: mocks.create,
    },
  },
}))

vi.mock('@/lib/services/gemini', () => ({
  CV_STUDIO_MODEL: 'gemini-3-flash-preview',
  rewriteCvWithChangelog: (...args: unknown[]) => mocks.rewriteCvWithChangelog(...args),
}))

vi.mock('@/lib/security/monthly-quota', () => ({
  USAGE_EVENT_TYPES: {
    CV_EDIT: 'CV_EDIT',
  },
  enforceMonthlyQuota: (...args: unknown[]) => mocks.enforceMonthlyQuota(...args),
  recordUsageEvent: (...args: unknown[]) => mocks.recordUsageEvent(...args),
}))

vi.mock('@/app/api/cv/_lib/job-targets', () => ({
  resolveCvJobTargets: (...args: unknown[]) => mocks.resolveCvJobTargets(...args),
}))

import { POST } from './route'

describe('POST /api/cv-edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.enforceMonthlyQuota.mockResolvedValue(null)
    mocks.recordUsageEvent.mockResolvedValue(undefined)
    mocks.resolveCvJobTargets.mockResolvedValue({
      targets: [],
      warnings: [],
      selectedCount: 0,
    })
    mocks.rewriteCvWithChangelog.mockResolvedValue({
      improvedCv: 'updated cv',
      changes: [
        {
          section: 'Summary',
          before: 'Old summary',
          after: 'New summary',
          reason: 'More specific',
        },
      ],
    })
    mocks.create.mockResolvedValue({
      id: 'doc-new',
      createdAt: new Date('2026-02-16T10:00:00.000Z'),
      parsedContent: 'updated cv',
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/cv-edit', {
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

    const req = new NextRequest('http://localhost/api/cv-edit', {
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

  it('creates a new cv version with changelog', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'PRO' })
    mocks.findFirst.mockResolvedValue({ id: 'doc-1', parsedContent: 'before cv' })
    mocks.resolveCvJobTargets.mockResolvedValue({
      targets: [
        {
          afJobId: '123',
          jobTitle: 'Role',
          jobDescription: 'Description',
          companyName: 'Company',
        },
      ],
      warnings: ['Could not load job description for saved job 124.'],
      selectedCount: 2,
    })

    const req = new NextRequest('http://localhost/api/cv-edit', {
      method: 'POST',
      body: JSON.stringify({
        cvDocumentId: 'doc-1',
        selectedJobIds: ['123', '124'],
        directiveText: 'Keep this concise',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: {
        document: {
          id: 'doc-new',
          createdAt: '2026-02-16T10:00:00.000Z',
          parsedContent: 'updated cv',
        },
        changes: [
          {
            section: 'Summary',
            before: 'Old summary',
            after: 'New summary',
            reason: 'More specific',
          },
        ],
        targeted: true,
        usedJobCount: 1,
        selectedJobCount: 2,
        warnings: ['Could not load job description for saved job 124.'],
        model: 'gemini-3-flash-preview',
      },
    })

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        type: 'cv',
        parsedContent: 'updated cv',
        fileUrl: null,
      },
      select: {
        id: true,
        createdAt: true,
        parsedContent: true,
      },
    })
    expect(mocks.recordUsageEvent).toHaveBeenCalledWith('u1', 'CV_EDIT')
  })

  it('returns 500 when ai output is empty', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'PRO' })
    mocks.findFirst.mockResolvedValue({ id: 'doc-1', parsedContent: 'before cv' })
    mocks.rewriteCvWithChangelog.mockResolvedValue({
      improvedCv: '   ',
      changes: [],
    })

    const req = new NextRequest('http://localhost/api/cv-edit', {
      method: 'POST',
      body: JSON.stringify({ cvDocumentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR' },
    })
  })
})
