const DOCUMENTS_BUCKET = 'documents'
const SIGNED_URL_TTL_SECONDS = 60 * 10

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function getDocumentStoragePath(
  fileRef: string | null | undefined
): string | null {
  if (!fileRef) return null

  const trimmed = fileRef.trim()
  if (!trimmed) return null

  if (!isHttpUrl(trimmed)) {
    return trimmed.replace(/^\/+/, '')
  }

  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/').filter(Boolean)
    const bucketIndex = parts.indexOf(DOCUMENTS_BUCKET)

    if (bucketIndex === -1) return null

    const path = parts.slice(bucketIndex + 1).join('/')
    return path ? decodeURIComponent(path) : null
  } catch {
    return null
  }
}

interface SignedUrlData {
  signedUrl: string
}

interface SignedUrlError {
  message: string
}

interface SupabaseStorageClientLike {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{ data: SignedUrlData | null; error: SignedUrlError | null }>
    }
  }
}

export async function resolveDocumentAccessUrl(
  supabase: SupabaseStorageClientLike,
  fileRef: string | null | undefined
): Promise<string | null> {
  const storagePath = getDocumentStoragePath(fileRef)

  if (!storagePath) {
    return null
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL for document access:', error?.message)
    return null
  }

  return data.signedUrl
}

