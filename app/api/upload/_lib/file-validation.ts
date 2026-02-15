export function getFileExtension(filename: string) {
  const lower = filename.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return lower.slice(dotIndex)
}

export function normalizeMimeType(rawMimeType: string, filename: string) {
  const extension = getFileExtension(filename)
  const mimeType = rawMimeType.trim().toLowerCase()

  if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf') {
    return 'application/pdf'
  }

  if (extension === '.pdf' && (mimeType === '' || mimeType === 'application/octet-stream')) {
    return 'application/pdf'
  }

  return mimeType
}

function hasPdfSignature(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

function hasZipSignature(bytes: Uint8Array) {
  if (bytes.length < 4) return false
  const sig0 = bytes[0]
  const sig1 = bytes[1]
  const sig2 = bytes[2]
  const sig3 = bytes[3]
  const isPk = sig0 === 0x50 && sig1 === 0x4b
  const validTail =
    (sig2 === 0x03 && sig3 === 0x04) ||
    (sig2 === 0x05 && sig3 === 0x06) ||
    (sig2 === 0x07 && sig3 === 0x08)
  return isPk && validTail
}

function looksLikePlainText(bytes: Uint8Array) {
  const sampleLength = Math.min(bytes.length, 4096)
  for (let i = 0; i < sampleLength; i += 1) {
    if (bytes[i] === 0x00) {
      return false
    }
  }
  return true
}

export function validateFileSignature(mimeType: string, bytes: Uint8Array) {
  if (mimeType === 'application/pdf') {
    return hasPdfSignature(bytes)
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return hasZipSignature(bytes)
  }

  if (mimeType === 'text/plain') {
    return looksLikePlainText(bytes)
  }

  return false
}

export function extensionMatchesMime(filename: string, mimeType: string) {
  const extension = getFileExtension(filename)
  if (mimeType === 'application/pdf') return extension === '.pdf'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extension === '.docx'
  }
  if (mimeType === 'text/plain') return extension === '.txt'
  return false
}
