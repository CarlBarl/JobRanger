import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findFirst: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  storageUpdate: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: mocks.getUser,
    },
    storage: {
      from: () => ({
        remove: mocks.remove,
        update: mocks.storageUpdate,
      }),
    },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: mocks.findFirst,
      delete: mocks.delete,
      update: mocks.update,
    },
  },
}))

import { DELETE, PATCH } from './route'

describe('DELETE /api/documents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/documents/d1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when document not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/documents/d1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('deletes document and removes storage object when possible', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue({
      id: 'd1',
      userId: 'u1',
      fileUrl:
        'https://example.supabase.co/storage/v1/object/public/documents/u1/1-cv.txt',
    })
    mocks.remove.mockResolvedValue({ data: [], error: null })
    mocks.delete.mockResolvedValue({ id: 'd1' })

    const req = new NextRequest('http://localhost/api/documents/d1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(mocks.remove).toHaveBeenCalledWith(['u1/1-cv.txt'])
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: 'd1' } })
  })
})

describe('PATCH /api/documents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 'new content' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when document not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 'new content' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('returns 400 when parsedContent is not a string', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 123 }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('returns 400 when request body is invalid JSON', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: 'not valid json',
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' },
    })
  })

  it('updates parsedContent for owned document', async () => {
    const mockDoc = {
      id: 'd1',
      userId: 'u1',
      parsedContent: 'old content',
      fileUrl: 'https://example.supabase.co/storage/v1/object/public/documents/u1/1-cv.txt',
    }
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(mockDoc)
    mocks.storageUpdate.mockResolvedValue({ data: {}, error: null })
    mocks.update.mockResolvedValue({ ...mockDoc, parsedContent: 'new content' })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 'new content' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.parsedContent).toBe('new content')
    expect(mocks.storageUpdate).toHaveBeenCalledWith(
      'u1/1-cv.txt',
      expect.any(Buffer),
      { contentType: 'text/plain', upsert: true }
    )
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { parsedContent: 'new content' },
    })
  })

  it('updates only database when document has no fileUrl', async () => {
    const mockDoc = {
      id: 'd1',
      userId: 'u1',
      parsedContent: 'old content',
      fileUrl: null,
    }
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(mockDoc)
    mocks.update.mockResolvedValue({ ...mockDoc, parsedContent: 'new content' })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 'new content' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.parsedContent).toBe('new content')
    expect(mocks.storageUpdate).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { parsedContent: 'new content' },
    })
  })
})
