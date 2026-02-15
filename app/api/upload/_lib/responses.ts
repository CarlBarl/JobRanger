import { NextResponse } from 'next/server'

export function badRequest(message: string) {
  return NextResponse.json(
    { success: false, error: { code: 'BAD_REQUEST', message } },
    { status: 400 }
  )
}

export function unauthorized(message = 'Not authenticated') {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  )
}

export function internalError(message: string, requestId: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        requestId,
      },
    },
    { status: 500, headers: { 'x-upload-request-id': requestId } }
  )
}
