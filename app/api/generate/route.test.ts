import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrCreateUser: vi.fn(),
  getJobById: vi.fn(),
  generateCoverLetter: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
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
    document: { findFirst: mocks.findFirst },
    savedJob: { findUnique: mocks.findUnique },
    generatedLetter: { create: mocks.create },
  },
}))

import { POST } from './route'

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
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
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
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
      data: { id: 'letter-1', content: 'letter', createdAt: 'now' },
    })

    expect(mocks.generateCoverLetter).toHaveBeenCalledWith({
      cvContent: 'cv text',
      jobTitle: 'Dev',
      jobDescription: 'desc',
      companyName: 'ACME',
      personalLetterContent: 'personal letter text',
    })
    expect(mocks.create).toHaveBeenCalled()
  })
})

