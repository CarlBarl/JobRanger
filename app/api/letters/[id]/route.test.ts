import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { MAX_PARSED_CONTENT_CHARS } from '@/lib/constants'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  deleteMany: vi.fn(),
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    generatedLetter: {
      deleteMany: mocks.deleteMany,
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}))

import { DELETE, PATCH } from './route'

describe('DELETE /api/letters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/letters/l1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.deleteMany.mockResolvedValue({ count: 0 })

    const req = new NextRequest('http://localhost/api/letters/l1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('deletes a letter for the user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.deleteMany.mockResolvedValue({ count: 1 })

    const req = new NextRequest('http://localhost/api/letters/l1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: 'l1', userId: 'u1' } })
  })
})

describe('PATCH /api/letters/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/letters/l1', {
      method: 'PATCH',
      body: JSON.stringify({ content: 'new content' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when the letter is not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/letters/l1', {
      method: 'PATCH',
      body: JSON.stringify({ content: 'new content' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('returns 400 when body is invalid JSON', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/letters/l1', {
      method: 'PATCH',
      body: 'not json',
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' },
    })
  })

  it('returns 400 when content is not a string', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/letters/l1', {
      method: 'PATCH',
      body: JSON.stringify({ content: 123 }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('returns 400 when content is empty', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/letters/l1', {
      method: 'PATCH',
      body: JSON.stringify({ content: '   ' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'content cannot be empty' },
    })
  })

  it('returns 413 when content is too large', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/letters/l1', {
      method: 'PATCH',
      body: JSON.stringify({ content: 'a'.repeat(MAX_PARSED_CONTENT_CHARS + 1) }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(413)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE' },
    })
  })

  it('updates a letter for the user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue({ id: 'l1' })
    mocks.update.mockResolvedValue({ id: 'l1', content: 'updated content' })

    const req = new NextRequest('http://localhost/api/letters/l1', {
      method: 'PATCH',
      body: JSON.stringify({ content: 'updated content' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'l1' }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: {
        id: 'l1',
        content: 'updated content',
      },
    })
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { content: 'updated content' },
      select: { id: true, content: true },
    })
  })
})
