import type { NextRequest } from 'next/server'

function formatErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    }
  }

  return {
    message: String(error),
  }
}

export function createUploadLogger(request: NextRequest, requestId: string) {
  const logPrefix = `[api/upload][${requestId}]`

  const header = (name: string) => request.headers?.get?.(name) ?? null

  const info = (event: string, context?: Record<string, unknown>) => {
    if (context) {
      console.info(logPrefix, event, context)
      return
    }
    console.info(logPrefix, event)
  }

  const error = (event: string, reason: unknown, context?: Record<string, unknown>) => {
    const details = formatErrorForLog(reason)
    if (context) {
      console.error(logPrefix, event, { ...context, error: details })
      return
    }
    console.error(logPrefix, event, { error: details })
  }

  const logRequestStart = () =>
    info('request.start', {
      method: request.method ?? null,
      pathname: request.nextUrl?.pathname ?? null,
      contentType: header('content-type'),
      origin: header('origin'),
    })

  return {
    header,
    info,
    error,
    logRequestStart,
  }
}
