type SecurityLogLevel = 'info' | 'warn' | 'error'

type SecurityLogContext = Record<string, unknown>

type RequestLike = {
  headers?: {
    get?: (name: string) => string | null
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    }
  }

  return { message: String(error) }
}

export function resolveRequestId(request?: RequestLike): string {
  const headerId =
    request?.headers?.get?.('x-request-id') ??
    request?.headers?.get?.('x-correlation-id') ??
    null

  if (headerId && headerId.trim().length > 0) {
    return headerId.trim()
  }

  return crypto.randomUUID()
}

export function securityLog(
  level: SecurityLogLevel,
  event: string,
  context: SecurityLogContext = {}
) {
  const payload = { event, ...context }

  if (level === 'error') {
    console.error('[security]', payload)
    return
  }

  if (level === 'warn') {
    console.warn('[security]', payload)
    return
  }

  console.info('[security]', payload)
}

export function securityErrorLog(
  event: string,
  error: unknown,
  context: SecurityLogContext = {}
) {
  securityLog('error', event, {
    ...context,
    error: formatError(error),
  })
}
