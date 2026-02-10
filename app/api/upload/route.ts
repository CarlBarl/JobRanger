import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import {
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_MIME_SET,
  ALLOWED_UPLOAD_EXTENSIONS,
} from '@/lib/constants'
import { PDFParse } from 'pdf-parse'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import {
  consumeRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/security/rate-limit'

function sanitizeFilename(filename: string) {
  return filename.replace(/[^\w.\-]+/g, '_')
}

function getFileExtension(filename: string) {
  const lower = filename.toLowerCase()
  const dotIndex = lower.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return lower.slice(dotIndex)
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

function validateFileSignature(mimeType: string, bytes: Uint8Array) {
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

function extensionMatchesMime(filename: string, mimeType: string) {
  const extension = getFileExtension(filename)
  if (mimeType === 'application/pdf') return extension === '.pdf'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extension === '.docx'
  }
  if (mimeType === 'text/plain') return extension === '.txt'
  return false
}

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const ipLimit = consumeRateLimit('upload-ip', getClientIp(request), 30, 60 * 60 * 1000)
  if (!ipLimit.allowed) {
    return rateLimitResponse('Upload rate limit exceeded. Please try again later.', ipLimit.retryAfterSeconds)
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const typeValue = formData.get('type')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No file provided' } },
        { status: 400 }
      )
    }

    if (typeof typeValue !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    if (typeValue !== 'cv' && typeValue !== 'personal_letter') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    if (!ALLOWED_UPLOAD_MIME_SET.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'File must be PDF, DOCX, or TXT' },
        },
        { status: 400 }
      )
    }

    const extension = getFileExtension(file.name)
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Unsupported file extension' },
        },
        { status: 400 }
      )
    }

    if (!extensionMatchesMime(file.name, file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'File extension does not match MIME type' },
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'File must be less than 5MB' } },
        { status: 400 }
      )
    }

    let fileBytes: Uint8Array | null = null
    if (typeof file.arrayBuffer === 'function') {
      fileBytes = new Uint8Array(await file.arrayBuffer())
      if (!validateFileSignature(file.type, fileBytes)) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'BAD_REQUEST', message: 'File signature does not match type' },
          },
          { status: 400 }
        )
      }
    } else if (file.type !== 'text/plain') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Unable to validate uploaded file' },
        },
        { status: 400 }
      )
    }

    if (!authUser.email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
        },
        { status: 400 }
      )
    }

    const user = await getOrCreateUser(authUser.id, authUser.email)

    const safeName = sanitizeFilename(file.name)
    const fileName = `${user.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload file' } },
        { status: 500 }
      )
    }

    // Parse file content based on MIME type.
    // In some test environments (jsdom), File lacks `text()`/`arrayBuffer()`, so we feature-detect.
    let parsedContent: string | null = '[File parsing not implemented]'
    if (file.type === 'text/plain') {
      if (fileBytes) {
        const bytes = fileBytes

        // Try UTF-8 first, then fall back to Windows-1252 for Swedish text files
        let text = new TextDecoder('utf-8').decode(bytes)

        // Check for Mojibake patterns (UTF-8 bytes misread as Latin-1)
        // These patterns indicate the file was likely Windows-1252/Latin-1 encoded
        const hasMojibake = /Ã¤|Ã¶|Ã¥|Ã„|Ã–|Ã…/.test(text)

        if (hasMojibake) {
          // Re-decode as Windows-1252 (superset of Latin-1, common on Windows)
          text = new TextDecoder('windows-1252').decode(bytes)
        }

        parsedContent = text
      } else if (typeof file.text === 'function') {
        parsedContent = await file.text()
      }
    } else if (file.type === 'application/pdf') {
      let parser: PDFParse | null = null
      try {
        const bytes = fileBytes ?? new Uint8Array(await file.arrayBuffer())
        const buffer = Buffer.from(bytes)
        parser = new PDFParse({ data: new Uint8Array(buffer) })
        const result = await parser.getText()
        parsedContent = result.text
      } catch (e) {
        console.error('PDF parse error:', e)
        parsedContent = null
      } finally {
        if (parser) {
          try {
            await parser.destroy()
          } catch (e) {
            console.error('PDF parser cleanup error:', e)
          }
        }
      }
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: typeValue,
        fileUrl: fileName,
        parsedContent,
      },
    })

    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process upload' } },
      { status: 500 }
    )
  }
}
