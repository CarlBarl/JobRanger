import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  getOrCreateUser: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
    storage: {
      from: () => ({
        upload: mocks.upload,
      }),
    },
  }),
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: mocks.getOrCreateUser,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      create: mocks.create,
    },
  },
}))

import { POST } from './route'

function makeRequest(formData: FormData) {
  return {
    formData: async () => formData,
  } as unknown as NextRequest
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', new File(['hi'], 'cv.txt', { type: 'text/plain' }))

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 400 when no file provided', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })

    const fd = new FormData()
    fd.set('type', 'cv')

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('returns 400 for invalid document type', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })

    const fd = new FormData()
    fd.set('type', 'nope')
    fd.set('file', new File(['hi'], 'cv.txt', { type: 'text/plain' }))

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('returns 400 for unsupported file type', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', new File(['hi'], 'cv.exe', { type: 'application/octet-stream' }))

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('uploads to storage and creates document record', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    mocks.upload.mockResolvedValue({ data: { path: 'u1/1-cv.txt' }, error: null })
    mocks.create.mockResolvedValue({ id: 'doc-1', fileUrl: 'u1/1-cv.txt' })

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', new File(['hi'], 'cv.txt', { type: 'text/plain' }))

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { id: 'doc-1' },
    })
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        type: 'cv',
        parsedContent: expect.any(String),
        fileUrl: expect.stringMatching(/^u1\/\d+-cv\.txt$/),
      }),
    })
  })
})
