import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { jsonBadRequest, jsonUnauthorized } from '@/lib/api/errors'

export type RouteUser = Pick<User, 'id' | 'email'>

type AuthResult = { user: RouteUser }
type AuthWithEmailResult = { user: RouteUser; email: string }

export async function requireSupabaseUser(): Promise<AuthResult | Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return jsonUnauthorized()
  }

  return { user: { id: user.id, email: user.email } }
}

export async function requireSupabaseUserWithEmail(): Promise<AuthWithEmailResult | Response> {
  const authResult = await requireSupabaseUser()
  if (authResult instanceof Response) {
    return authResult
  }

  if (!authResult.user.email) {
    return jsonBadRequest('Missing email for authenticated user')
  }

  return {
    user: authResult.user,
    email: authResult.user.email,
  }
}
