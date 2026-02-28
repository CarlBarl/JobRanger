import mammoth from 'mammoth'

function normalizeDocxText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd()
}

export async function extractDocxText(bytes: Uint8Array): Promise<string | null> {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    return normalizeDocxText(result.value)
  } catch {
    return null
  }
}
