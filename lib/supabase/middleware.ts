import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { requireEnv } from '@/lib/config/env'

const PROTECTED_PATHS = ['/dashboard', '/cv-studio', '/jobs', '/letters', '/profile', '/onboarding', '/admin']

export async function updateSession(request: NextRequest) {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const secureOpts = {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
            }
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, secureOpts)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
