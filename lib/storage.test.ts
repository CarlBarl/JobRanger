import { describe, expect, it, vi } from 'vitest'
import { getDocumentStoragePath, resolveDocumentAccessUrl } from './storage'

describe('getDocumentStoragePath', () => {
  it('returns raw storage path when fileRef is already a path', () => {
    expect(getDocumentStoragePath('u1/123-cv.txt')).toBe('u1/123-cv.txt')
  })

  it('extracts storage path from public storage URL', () => {
    const url =
      'https://example.supabase.co/storage/v1/object/public/documents/u1/123-cv.txt'
    expect(getDocumentStoragePath(url)).toBe('u1/123-cv.txt')
  })
})

describe('resolveDocumentAccessUrl', () => {
  it('returns null when fileRef is invalid', async () => {
    const supabase = {
      storage: {
        from: vi.fn(),
      },
    } as unknown as Parameters<typeof resolveDocumentAccessUrl>[0]

    await expect(resolveDocumentAccessUrl(supabase, null)).resolves.toBeNull()
  })

  it('returns signed URL for valid fileRef', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed' },
      error: null,
    })

    const supabase = {
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrl }),
      },
    } as unknown as Parameters<typeof resolveDocumentAccessUrl>[0]

    await expect(resolveDocumentAccessUrl(supabase, 'u1/123-cv.txt')).resolves.toBe(
      'https://example.com/signed'
    )
    expect(createSignedUrl).toHaveBeenCalledWith('u1/123-cv.txt', 600)
  })
})

