type PasswordSignInApiResponse =
  | { success: true }
  | { success: false; error?: { message?: string } }

export type PasswordSignInResult =
  | { ok: true }
  | { ok: false; rawMessage?: string }

export async function signInWithPasswordApi(
  email: string,
  password: string
): Promise<PasswordSignInResult> {
  try {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const result = (await response.json()) as PasswordSignInApiResponse
    if (!response.ok || !result.success) {
      return {
        ok: false,
        rawMessage: !result.success ? result.error?.message : undefined,
      }
    }

    return { ok: true }
  } catch {
    return { ok: false }
  }
}
