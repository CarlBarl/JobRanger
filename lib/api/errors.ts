import { NextResponse } from 'next/server'

type ApiErrorCode = 'UNAUTHORIZED' | 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR' | string

type ApiErrorBody = {
  success: false
  error: {
    code: ApiErrorCode
    message: string
  }
}

function jsonError(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json<ApiErrorBody>(
    {
      success: false,
      error: { code, message },
    },
    { status }
  )
}

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init)
}

export function jsonUnauthorized(message = 'Not authenticated') {
  return jsonError('UNAUTHORIZED', message, 401)
}

export function jsonBadRequest(message: string) {
  return jsonError('BAD_REQUEST', message, 400)
}

export function jsonNotFound(message: string) {
  return jsonError('NOT_FOUND', message, 404)
}

export function jsonInternal(message: string) {
  return jsonError('INTERNAL_ERROR', message, 500)
}
