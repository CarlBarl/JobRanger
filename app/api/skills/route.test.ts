import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  extractSkillsFromCV: vi.fn(),
  fetchSkillCatalog: vi.fn(),
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

vi.mock('@/lib/services/jobtech-enrichments', () => ({
  fetchSkillCatalog: mocks.fetchSkillCatalog,
}))

import { POST } from './route'

describe('POST /api/skills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchSkillCatalog.mockResolvedValue([])
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
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
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
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
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
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
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
  })
})

