import { NextResponse, type NextRequest } from 'next/server'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import {
  MAX_UPLOAD_BYTES,
  ALLOWED_UPLOAD_MIME_SET,
  ALLOWED_UPLOAD_EXTENSIONS,
} from '@/lib/constants'
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

function normalizeMimeType(rawMimeType: string, filename: string) {
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

type PdfParser = {
  getText: () => Promise<{ text: string }>
  destroy: () => Promise<void>
}

type PdfParseConstructor = {
  new (params: { data: Uint8Array }): PdfParser
  setWorker: (workerSrc?: string) => string
}

type PdfWorkerBootstrapStatus =
  | 'skipped_test'
  | 'already_initialized'
  | 'initialized_from_module'
  | 'module_missing_handler'
  | 'module_import_failed'

let isPdfWorkerConfigured = false
let resolvedPdfWorkerSrc: string | null | undefined
const require = createRequire(import.meta.url)

function resolvePdfWorkerSource() {
  if (resolvedPdfWorkerSrc !== undefined) {
    return resolvedPdfWorkerSrc
  }

  try {
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
    const workerSource = readFileSync(workerPath, 'utf8')
    resolvedPdfWorkerSrc = `data:text/javascript;base64,${Buffer.from(workerSource, 'utf8').toString('base64')}`
  } catch {
    resolvedPdfWorkerSrc = null
  }

  return resolvedPdfWorkerSrc
}

async function ensurePdfJsWorkerHandler(): Promise<{
  status: PdfWorkerBootstrapStatus
  message?: string
}> {
  if (process.env.NODE_ENV === 'test') {
    return { status: 'skipped_test' }
  }

  const globalWithPdfWorker = globalThis as typeof globalThis & {
    pdfjsWorker?: { WorkerMessageHandler?: unknown }
  }

  if (globalWithPdfWorker.pdfjsWorker?.WorkerMessageHandler) {
    return { status: 'already_initialized' }
  }

  try {
    const workerModule = (await import('pdfjs-dist/legacy/build/pdf.worker.mjs')) as {
      WorkerMessageHandler?: unknown
    }

    if (!workerModule.WorkerMessageHandler) {
      return { status: 'module_missing_handler' }
    }

    globalWithPdfWorker.pdfjsWorker = {
      ...(globalWithPdfWorker.pdfjsWorker ?? {}),
      WorkerMessageHandler: workerModule.WorkerMessageHandler,
    }

    return { status: 'initialized_from_module' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { status: 'module_import_failed', message }
  }
}

async function getPdfParseConstructor(): Promise<PdfParseConstructor> {
  const { PDFParse } = await import('pdf-parse')

  const ctor = PDFParse as unknown as PdfParseConstructor

  if (!isPdfWorkerConfigured) {
    const workerSrc = resolvePdfWorkerSource()
    if (workerSrc) {
      ctor.setWorker(workerSrc)
    }
    isPdfWorkerConfigured = true
  }

  return ctor
}

function formatErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  let stage = 'init'
  const logPrefix = `[api/upload][${requestId}]`
  const logInfo = (event: string, context?: Record<string, unknown>) => {
    if (context) {
      console.info(logPrefix, event, context)
      return
    }
    console.info(logPrefix, event)
  }
  const logError = (event: string, error: unknown, context?: Record<string, unknown>) => {
    const details = formatErrorForLog(error)
    if (context) {
      console.error(logPrefix, event, { ...context, error: details })
      return
    }
    console.error(logPrefix, event, { error: details })
  }

  const header = (name: string) => request.headers?.get?.(name) ?? null

  logInfo('request.start', {
    method: request.method ?? null,
    pathname: request.nextUrl?.pathname ?? null,
    contentType: header('content-type'),
    origin: header('origin'),
  })

  const csrfError = enforceCsrfProtection(request)
  if (csrfError) {
    logInfo('request.rejected.csrf')
    return csrfError
  }

  const ipLimit = consumeRateLimit('upload-ip', getClientIp(request), 30, 60 * 60 * 1000)
  if (!ipLimit.allowed) {
    logInfo('request.rejected.rate_limit', { retryAfterSeconds: ipLimit.retryAfterSeconds })
    return rateLimitResponse('Upload rate limit exceeded. Please try again later.', ipLimit.retryAfterSeconds)
  }

  stage = 'auth.get_user'
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    logInfo('request.rejected.unauthenticated')
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    stage = 'form_data.parse'
    const formData = await request.formData()
    const file = formData.get('file')
    const typeValue = formData.get('type')

    if (!(file instanceof File)) {
      logInfo('request.rejected.no_file')
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No file provided' } },
        { status: 400 }
      )
    }

    if (typeof typeValue !== 'string') {
      logInfo('request.rejected.invalid_type_field')
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    if (typeValue !== 'cv' && typeValue !== 'personal_letter') {
      logInfo('request.rejected.invalid_document_type', { typeValue })
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    const normalizedMimeType = normalizeMimeType(file.type, file.name)
    logInfo('file.received', {
      name: file.name,
      size: file.size,
      rawMimeType: file.type,
      normalizedMimeType,
      documentType: typeValue,
    })

    if (!ALLOWED_UPLOAD_MIME_SET.has(normalizedMimeType)) {
      logInfo('request.rejected.invalid_mime', { normalizedMimeType })
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
      logInfo('request.rejected.invalid_extension', { extension, fileName: file.name })
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Unsupported file extension' },
        },
        { status: 400 }
      )
    }

    if (!extensionMatchesMime(file.name, normalizedMimeType)) {
      logInfo('request.rejected.extension_mime_mismatch', {
        extension,
        normalizedMimeType,
      })
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'File extension does not match MIME type' },
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      logInfo('request.rejected.file_too_large', {
        size: file.size,
        maxBytes: MAX_UPLOAD_BYTES,
      })
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'File must be less than 5MB' } },
        { status: 400 }
      )
    }

    stage = 'file.signature_validation'
    let fileBytes: Uint8Array | null = null
    if (typeof file.arrayBuffer === 'function') {
      fileBytes = new Uint8Array(await file.arrayBuffer())
      const signatureOk = validateFileSignature(normalizedMimeType, fileBytes)
      if (!signatureOk) {
        logInfo('request.rejected.signature_mismatch', {
          normalizedMimeType,
          firstBytesHex: Array.from(fileBytes.slice(0, 8))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join(''),
        })
        return NextResponse.json(
          {
            success: false,
            error: { code: 'BAD_REQUEST', message: 'File signature does not match type' },
          },
          { status: 400 }
        )
      }
    } else if (normalizedMimeType !== 'text/plain') {
      logInfo('request.rejected.no_arraybuffer_for_binary', { normalizedMimeType })
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Unable to validate uploaded file' },
        },
        { status: 400 }
      )
    }

    if (!authUser.email) {
      logInfo('request.rejected.missing_auth_email')
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
        },
        { status: 400 }
      )
    }

    stage = 'user.resolve'
    const user = await getOrCreateUser(authUser.id, authUser.email)

    const safeName = sanitizeFilename(file.name)
    const fileName = `${user.id}/${Date.now()}-${safeName}`

    const uploadPayload =
      fileBytes && normalizedMimeType
        ? new Blob([Uint8Array.from(fileBytes)], { type: normalizedMimeType })
        : file

    stage = 'storage.upload'
    logInfo('storage.upload.start', {
      bucket: 'documents',
      fileName,
      normalizedMimeType,
      payloadKind: uploadPayload instanceof Blob ? 'blob' : 'file',
    })
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, uploadPayload, { contentType: normalizedMimeType || undefined })

    if (uploadError) {
      logError('storage.upload.error', uploadError, {
        fileName,
        normalizedMimeType,
      })
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to upload file',
            requestId,
          },
        },
        { status: 500, headers: { 'x-upload-request-id': requestId } }
      )
    }

    logInfo('storage.upload.success', { fileName })

    // Parse file content based on MIME type.
    // In some test environments (jsdom), File lacks `text()`/`arrayBuffer()`, so we feature-detect.
    let parsedContent: string | null = '[File parsing not implemented]'
    if (normalizedMimeType === 'text/plain') {
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
    } else if (normalizedMimeType === 'application/pdf') {
      stage = 'pdf.parse'
      let parser: PdfParser | null = null
      try {
        const bytes = fileBytes ?? new Uint8Array(await file.arrayBuffer())
        const buffer = Buffer.from(bytes)
        const workerBootstrap = await ensurePdfJsWorkerHandler()
        logInfo('pdf.worker.bootstrap', workerBootstrap)
        // Load lazily so parser module/runtime incompatibilities do not fail all uploads.
        const PDFParse = await getPdfParseConstructor()
        logInfo('pdf.worker.src', { workerSrc: PDFParse.setWorker() })
        parser = new PDFParse({ data: new Uint8Array(buffer) })
        const result = await parser.getText()
        parsedContent = result.text
      } catch (e) {
        logError('pdf.parse.error', e, {
          fileName,
          normalizedMimeType,
        })
        parsedContent = null
      } finally {
        if (parser) {
          try {
            await parser.destroy()
          } catch (e) {
            logError('pdf.parse.cleanup_error', e, { fileName })
          }
        }
      }
    }

    stage = 'db.document_create'
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: typeValue,
        fileUrl: fileName,
        parsedContent,
      },
    })

    logInfo('request.success', {
      documentId: document.id,
      fileName,
      parsedContentLength: parsedContent?.length ?? null,
    })
    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    logError('request.failure', error, { stage })
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process upload',
          requestId,
        },
      },
      { status: 500, headers: { 'x-upload-request-id': requestId } }
    )
  }
}
