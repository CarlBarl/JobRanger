export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

export const ALLOWED_UPLOAD_MIME_SET = new Set<string>(ALLOWED_UPLOAD_MIME_TYPES)
