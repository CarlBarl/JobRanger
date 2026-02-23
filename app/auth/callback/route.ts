import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'

function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext) return '/dashboard'
  if (!rawNext.startsWith('/')) return '/dashboard'
  if (rawNext.startsWith('//')) return '/dashboard'
  if (/[\r\n]/.test(rawNext)) return '/dashboard'
  return rawNext
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user?.id && user.email) {
          await getOrCreateUser(user.id, user.email)
        }
      } catch (upsertError) {
        console.error(
          'User upsert after auth callback failed:',
          upsertError instanceof Error ? upsertError.message : upsertError
        )
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/signin?error=Could%20not%20authenticate`
  )
}
