import { NextResponse, type NextRequest } from 'next/server'
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
import { sanitizeFilename } from '@/lib/security/sanitize'
import {
  extensionMatchesMime,
  getFileExtension,
  normalizeMimeType,
  validateFileSignature,
} from './_lib/file-validation'
import { createUploadLogger } from './_lib/logger'
import { extractDocxText } from './_lib/docx-parser'
import { extractPdfText } from './_lib/pdf-parser'
import { badRequest, internalError, unauthorized } from './_lib/responses'
import { parsePlainTextUpload } from './_lib/text-parser'

type UploadDocumentType = 'cv' | 'personal_letter'

function parseDocumentType(value: FormDataEntryValue | null): UploadDocumentType | null {
  if (value === 'cv' || value === 'personal_letter') {
    return value
  }
  return null
}

function firstBytesHex(bytes: Uint8Array, limit = 8) {
  return Array.from(bytes.slice(0, limit))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  let stage = 'init'
  const logger = createUploadLogger(request, requestId)
  logger.logRequestStart()

  const csrfError = enforceCsrfProtection(request)
  if (csrfError) {
    logger.info('request.rejected.csrf')
    return csrfError
  }

  const ipLimit = await consumeRateLimit('upload-ip', getClientIp(request), 30, 60 * 60 * 1000)
  if (!ipLimit.allowed) {
    logger.info('request.rejected.rate_limit', { retryAfterSeconds: ipLimit.retryAfterSeconds })
    return rateLimitResponse(
      'Upload rate limit exceeded. Please try again later.',
      ipLimit.retryAfterSeconds
    )
  }

  stage = 'auth.get_user'
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    logger.info('request.rejected.unauthenticated')
    return unauthorized()
  }

  try {
    stage = 'form_data.parse'
    const formData = await request.formData()
    const file = formData.get('file')
    const documentType = parseDocumentType(formData.get('type'))

    if (!(file instanceof File)) {
      logger.info('request.rejected.no_file')
      return badRequest('No file provided')
    }

    if (!documentType) {
      logger.info('request.rejected.invalid_document_type')
      return badRequest('Invalid document type')
    }

    const normalizedMimeType = normalizeMimeType(file.type, file.name)
    logger.info('file.received', {
      name: file.name,
      size: file.size,
      rawMimeType: file.type,
      normalizedMimeType,
      documentType,
    })

    if (!ALLOWED_UPLOAD_MIME_SET.has(normalizedMimeType)) {
      logger.info('request.rejected.invalid_mime', { normalizedMimeType })
      return badRequest('File must be PDF, DOCX, or TXT')
    }

    const extension = getFileExtension(file.name)
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
      logger.info('request.rejected.invalid_extension', { extension, fileName: file.name })
      return badRequest('Unsupported file extension')
    }

    if (!extensionMatchesMime(file.name, normalizedMimeType)) {
      logger.info('request.rejected.extension_mime_mismatch', { extension, normalizedMimeType })
      return badRequest('File extension does not match MIME type')
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      logger.info('request.rejected.file_too_large', {
        size: file.size,
        maxBytes: MAX_UPLOAD_BYTES,
      })
      return badRequest('File must be less than 5MB')
    }

    stage = 'file.signature_validation'
    let fileBytes: Uint8Array | null = null
    if (typeof file.arrayBuffer === 'function') {
      fileBytes = new Uint8Array(await file.arrayBuffer())
      if (!validateFileSignature(normalizedMimeType, fileBytes)) {
        logger.info('request.rejected.signature_mismatch', {
          normalizedMimeType,
          firstBytesHex: firstBytesHex(fileBytes),
        })
        return badRequest('File signature does not match type')
      }
    } else if (normalizedMimeType !== 'text/plain') {
      logger.info('request.rejected.no_arraybuffer_for_binary', { normalizedMimeType })
      return badRequest('Unable to validate uploaded file')
    }

    if (!authUser.email) {
      logger.info('request.rejected.missing_auth_email')
      return badRequest('Missing email for authenticated user')
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
    logger.info('storage.upload.start', {
      bucket: 'documents',
      fileName,
      normalizedMimeType,
      payloadKind: uploadPayload instanceof Blob ? 'blob' : 'file',
    })

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, uploadPayload, { contentType: normalizedMimeType || undefined })

    if (uploadError) {
      logger.error('storage.upload.error', uploadError, { fileName, normalizedMimeType })
      return internalError('Failed to upload file', requestId)
    }

    logger.info('storage.upload.success', { fileName })

    let parsedContent: string | null = '[File parsing not implemented]'
    if (normalizedMimeType === 'text/plain') {
      parsedContent = await parsePlainTextUpload(file, fileBytes)
    } else if (normalizedMimeType === 'application/pdf') {
      stage = 'pdf.parse'
      const bytes = fileBytes ?? new Uint8Array(await file.arrayBuffer())
      parsedContent = await extractPdfText(bytes, {
        onWorkerBootstrap: (result) => logger.info('pdf.worker.bootstrap', result),
        onWorkerSource: (workerSrc) => logger.info('pdf.worker.src', { workerSrc }),
        onParseError: (error) => logger.error('pdf.parse.error', error, { fileName, normalizedMimeType }),
        onCleanupError: (error) => logger.error('pdf.parse.cleanup_error', error, { fileName }),
      })
    } else if (normalizedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      stage = 'docx.parse'
      const bytes = fileBytes ?? new Uint8Array(await file.arrayBuffer())
      parsedContent = await extractDocxText(bytes)
      if (parsedContent === null) {
        logger.error('docx.parse.error', 'Failed to extract DOCX text', {
          fileName,
          normalizedMimeType,
        })
      }
    }

    stage = 'db.document_create'
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type: documentType,
        fileUrl: fileName,
        parsedContent,
      },
    })

    logger.info('request.success', {
      documentId: document.id,
      fileName,
      parsedContentLength: parsedContent?.length ?? null,
    })
    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    logger.error('request.failure', error, { stage })
    return internalError('Failed to process upload', requestId)
  }
}
