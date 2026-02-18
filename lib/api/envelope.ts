export type ApiErrorPayload = {
  code?: string
  message?: string
  [key: string]: unknown
}

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiFailure = {
  success: false
  error: ApiErrorPayload
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

export function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

export function isApiSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return isApiEnvelope<T>(value) && value.success
}

export function isApiFailure(value: unknown): value is ApiFailure {
  return isApiEnvelope<unknown>(value) && !value.success && !!value.error
}
