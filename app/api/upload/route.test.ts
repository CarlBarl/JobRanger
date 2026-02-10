import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  getOrCreateUser: vi.fn(),
  create: vi.fn(),
  pdfGetText: vi.fn(),
  pdfDestroy: vi.fn(),
  pdfSetWorker: vi.fn(),
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
  createServiceClient: () => ({
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

vi.mock('pdf-parse', () => ({
  PDFParse: class {
    static setWorker = mocks.pdfSetWorker
    getText = mocks.pdfGetText
    destroy = mocks.pdfDestroy
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

  it('accepts application/x-pdf MIME alias', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    mocks.upload.mockResolvedValue({ data: { path: 'u1/1-cv.pdf' }, error: null })
    mocks.create.mockResolvedValue({ id: 'doc-alias', fileUrl: 'u1/1-cv.pdf' })
    mocks.pdfGetText.mockResolvedValue({ text: 'Extracted PDF text content' })
    mocks.pdfDestroy.mockResolvedValue(undefined)

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer
    const pdfFile = new File(['%PDF-fake'], 'cv.pdf', { type: 'application/x-pdf' })
    pdfFile.arrayBuffer = async () => pdfBytes

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', pdfFile)

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^u1\/\d+-cv\.pdf$/),
      expect.any(Blob),
      { contentType: 'application/pdf' }
    )
  })

  it('accepts application/octet-stream PDFs when extension and signature match', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    mocks.upload.mockResolvedValue({ data: { path: 'u1/1-cv.pdf' }, error: null })
    mocks.create.mockResolvedValue({ id: 'doc-octet', fileUrl: 'u1/1-cv.pdf' })
    mocks.pdfGetText.mockResolvedValue({ text: 'Extracted PDF text content' })
    mocks.pdfDestroy.mockResolvedValue(undefined)

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer
    const pdfFile = new File(['%PDF-fake'], 'cv.pdf', { type: 'application/octet-stream' })
    pdfFile.arrayBuffer = async () => pdfBytes

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', pdfFile)

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^u1\/\d+-cv\.pdf$/),
      expect.any(Blob),
      { contentType: 'application/pdf' }
    )
  })

  it('accepts PDFs with empty MIME type when extension and signature match', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    mocks.upload.mockResolvedValue({ data: { path: 'u1/1-cv.pdf' }, error: null })
    mocks.create.mockResolvedValue({ id: 'doc-empty', fileUrl: 'u1/1-cv.pdf' })
    mocks.pdfGetText.mockResolvedValue({ text: 'Extracted PDF text content' })
    mocks.pdfDestroy.mockResolvedValue(undefined)

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer
    const pdfFile = new File(['%PDF-fake'], 'cv.pdf')
    pdfFile.arrayBuffer = async () => pdfBytes

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', pdfFile)

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^u1\/\d+-cv\.pdf$/),
      expect.any(Blob),
      { contentType: 'application/pdf' }
    )
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

  it('parses PDF content on upload', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    mocks.upload.mockResolvedValue({ data: { path: 'u1/1-cv.pdf' }, error: null })
    mocks.create.mockResolvedValue({ id: 'doc-2', fileUrl: 'u1/1-cv.pdf' })
    mocks.pdfGetText.mockResolvedValue({ text: 'Extracted PDF text content' })
    mocks.pdfDestroy.mockResolvedValue(undefined)

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer
    const pdfFile = new File(['%PDF-fake'], 'cv.pdf', { type: 'application/pdf' })
    pdfFile.arrayBuffer = async () => pdfBytes

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', pdfFile)

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { id: 'doc-2' },
    })
    expect(mocks.pdfGetText).toHaveBeenCalled()
    expect(mocks.pdfDestroy).toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        type: 'cv',
        parsedContent: 'Extracted PDF text content',
      }),
    })
  })

  it('saves document with null parsedContent when PDF parsing fails', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    mocks.upload.mockResolvedValue({ data: { path: 'u1/1-cv.pdf' }, error: null })
    mocks.create.mockResolvedValue({ id: 'doc-3', fileUrl: 'u1/1-cv.pdf' })
    mocks.pdfGetText.mockRejectedValue(new Error('Invalid PDF'))

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer
    const pdfFile = new File(['not-a-pdf'], 'cv.pdf', { type: 'application/pdf' })
    pdfFile.arrayBuffer = async () => pdfBytes

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', pdfFile)

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { id: 'doc-3' },
    })
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        type: 'cv',
        parsedContent: null,
      }),
    })
    expect(mocks.pdfDestroy).toHaveBeenCalled()
  })

  it('preserves parsed PDF content when parser cleanup fails', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'e@example.com' } } })
    mocks.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    mocks.upload.mockResolvedValue({ data: { path: 'u1/1-cv.pdf' }, error: null })
    mocks.create.mockResolvedValue({ id: 'doc-4', fileUrl: 'u1/1-cv.pdf' })
    mocks.pdfGetText.mockResolvedValue({ text: 'Extracted PDF text content' })
    mocks.pdfDestroy.mockRejectedValue(new Error('Cleanup failure'))

    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer
    const pdfFile = new File(['%PDF-fake'], 'cv.pdf', { type: 'application/pdf' })
    pdfFile.arrayBuffer = async () => pdfBytes

    const fd = new FormData()
    fd.set('type', 'cv')
    fd.set('file', pdfFile)

    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      data: { id: 'doc-4' },
    })
    expect(mocks.pdfGetText).toHaveBeenCalled()
    expect(mocks.pdfDestroy).toHaveBeenCalled()
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        type: 'cv',
        parsedContent: 'Extracted PDF text content',
      }),
    })
  })
})
