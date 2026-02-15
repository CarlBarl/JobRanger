import type { PasswordSignInResult } from './sign-in-api'

export function resolvePasswordSignInError(
  result: PasswordSignInResult,
  invalidCredentialsMessage: string
) {
  if (result.ok) {
    return null
  }

  const rawMessage = result.rawMessage
  if (!rawMessage) {
    return invalidCredentialsMessage
  }

  if (rawMessage.toLowerCase().includes('invalid login credentials')) {
    return invalidCredentialsMessage
  }

  return rawMessage
}
