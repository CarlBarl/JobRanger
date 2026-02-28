import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  enforceLetterQuota: vi.fn(),
  recordUsageEvent: vi.fn(),
  honeCoverLetter: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
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

vi.mock('@/lib/security/monthly-quota', () => ({
  LETTER_HONE_COST_CREDITS: 1,
  enforceLetterQuota: (...args: unknown[]) => mocks.enforceLetterQuota(...args),
  recordUsageEvent: (...args: unknown[]) => mocks.recordUsageEvent(...args),
}))

vi.mock('@/lib/services/gemini', () => ({
  GEMINI_MODEL: 'gemini-flash-lite-latest',
  honeCoverLetter: (...args: unknown[]) => mocks.honeCoverLetter(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    generatedLetter: {
      findFirst: (...args: unknown[]) => mocks.findFirst(...args),
      update: (...args: unknown[]) => mocks.update(...args),
    },
  },
}))

import { POST } from './route'

describe('POST /api/letters/[id]/hone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.enforceLetterQuota.mockResolvedValue(null)
    mocks.recordUsageEvent.mockResolvedValue(undefined)
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/letters/l1/hone', {
      method: 'POST',
      body: JSON.stringify({ followUpPrompt: 'Make it more concise' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 403 for non-PRO users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'FREE' })

    const req = new NextRequest('http://localhost/api/letters/l1/hone', {
      method: 'POST',
      body: JSON.stringify({ followUpPrompt: 'Make it more concise' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    })
  })

  it('returns 429 when letter quota is exhausted', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'PRO' })
    mocks.enforceLetterQuota.mockResolvedValue(
      NextResponse.json(
        {
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: 'Monthly letter honing quota reached for your plan.' },
        },
        { status: 429 }
      )
    )

    const req = new NextRequest('http://localhost/api/letters/l1/hone', {
      method: 'POST',
      body: JSON.stringify({ followUpPrompt: 'Make it more concise' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'QUOTA_EXCEEDED' },
    })
  })

  it('returns 404 when letter is missing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'PRO' })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/letters/l1/hone', {
      method: 'POST',
      body: JSON.stringify({ followUpPrompt: 'Make it more concise' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('hones a letter and updates content', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1', tier: 'PRO' })
    mocks.findFirst.mockResolvedValue({
      id: 'l1',
      content: 'Original letter',
      jobTitle: 'Warehouse worker',
      savedJob: { employer: 'ACME' },
    })
    mocks.honeCoverLetter.mockResolvedValue('Improved letter')
    mocks.update.mockResolvedValue({ id: 'l1', content: 'Improved letter' })

    const req = new NextRequest('http://localhost/api/letters/l1/hone', {
      method: 'POST',
      body: JSON.stringify({
        followUpPrompt: 'Make it warmer and slightly shorter',
        baseContent: 'Draft override content',
      }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: {
        id: 'l1',
        content: 'Improved letter',
        model: 'gemini-flash-lite-latest',
      },
    })

    expect(mocks.honeCoverLetter).toHaveBeenCalledWith({
      currentLetterContent: 'Draft override content',
      followUpPrompt: 'Make it warmer and slightly shorter',
      jobTitle: 'Warehouse worker',
      companyName: 'ACME',
    })
    expect(mocks.recordUsageEvent).toHaveBeenCalledWith('u1', 'GENERATE_LETTER')
  })
})
