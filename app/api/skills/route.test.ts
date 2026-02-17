import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  extractSkillsFromCV: vi.fn(),
  fetchSkillCatalog: vi.fn(),
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}))

vi.mock('@/lib/services/gemini', () => ({
  extractSkillsFromCV: mocks.extractSkillsFromCV,
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: (...args: unknown[]) => mocks.getOrCreateUser(...args),
}))

vi.mock('@/lib/services/jobtech-enrichments', () => ({
  fetchSkillCatalog: mocks.fetchSkillCatalog,
}))

vi.mock('@/lib/security/monthly-quota', () => ({
  enforceMonthlyQuota: (...args: unknown[]) => mocks.enforceMonthlyQuota(...args),
  recordUsageEvent: (...args: unknown[]) => mocks.recordUsageEvent(...args),
}))

import { PATCH, POST } from './route'

describe('POST /api/skills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchSkillCatalog.mockResolvedValue([])
    mocks.enforceMonthlyQuota.mockResolvedValue(null)
    mocks.recordUsageEvent.mockResolvedValue(undefined)
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE' })
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/skills', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when document not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/skills', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('returns 400 when document has no parsed content', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.findFirst.mockResolvedValue({
      id: 'doc-1',
      userId: 'u1',
      type: 'cv',
      parsedContent: null,
    })

    const req = new NextRequest('http://localhost/api/skills', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('extracts skills and updates the document', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.findFirst.mockResolvedValue({
      id: 'doc-1',
      userId: 'u1',
      type: 'cv',
      parsedContent: 'cv text',
    })
    mocks.extractSkillsFromCV.mockResolvedValue(['React.js', 'Type Script', 'nodejs', 'Kubernetes'])
    mocks.fetchSkillCatalog.mockResolvedValue(['React', 'TypeScript', 'Node.js', 'Kubernetes'])

    const req = new NextRequest('http://localhost/api/skills', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { skills: ['React', 'TypeScript', 'Node.js', 'Kubernetes'] },
    })

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { skills: ['React', 'TypeScript', 'Node.js', 'Kubernetes'] },
    })
    expect(mocks.recordUsageEvent).toHaveBeenCalledWith('u1', 'SKILLS_EXTRACT')
  })

  it('returns 429 when monthly quota is exceeded', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.enforceMonthlyQuota.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: 'Monthly skills extraction quota reached for your plan.' },
        }),
        { status: 429, headers: { 'content-type': 'application/json' } }
      )
    )

    const req = new NextRequest('http://localhost/api/skills', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-1' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'QUOTA_EXCEEDED' },
    })
  })
})

describe('PATCH /api/skills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when skills array is too large', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    const tooManySkills = Array.from({ length: 101 }, (_, index) => `skill-${index}`)

    const req = new NextRequest('http://localhost/api/skills', {
      method: 'PATCH',
      body: JSON.stringify({ documentId: 'doc-1', skills: tooManySkills }),
    })

    const res = await PATCH(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('updates skills when payload is valid', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.findFirst.mockResolvedValue({ id: 'doc-1', userId: 'u1', type: 'cv' })
    mocks.update.mockResolvedValue({ id: 'doc-1', skills: ['React', 'TypeScript'] })

    const req = new NextRequest('http://localhost/api/skills', {
      method: 'PATCH',
      body: JSON.stringify({ documentId: 'doc-1', skills: ['React', 'TypeScript'] }),
    })

    const res = await PATCH(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { skills: ['React', 'TypeScript'] },
    })
  })
})

