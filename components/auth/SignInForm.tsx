'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from './AuthShell'
import { EMAIL_REGEX, type AuthMode } from './signin/constants'
import { resolvePasswordSignInError } from './signin/error-messages'
import { MagicLinkSignInPanel } from './signin/MagicLinkSignInPanel'
import { PasswordSignInPanel } from './signin/PasswordSignInPanel'
import { GoogleOAuthButton } from './signin/GoogleOAuthButton'
import { signInWithPasswordApi } from './signin/sign-in-api'

function sanitizeNextPath(rawNext: string | undefined) {
  if (!rawNext) return '/dashboard'
  if (!rawNext.startsWith('/')) return '/dashboard'
  if (rawNext.startsWith('//')) return '/dashboard'
  if (/[\r\n]/.test(rawNext)) return '/dashboard'
  return rawNext
}

export function SignInForm({ nextPath }: { nextPath?: string }) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [mode, setMode] = useState<AuthMode>('password')
  const [shouldShake, setShouldShake] = useState(false)

  const nextDestination = sanitizeNextPath(nextPath)

  useEffect(() => {
    if (!shouldShake) return
    const timeout = setTimeout(() => setShouldShake(false), 500)
    return () => clearTimeout(timeout)
  }, [shouldShake])

  const triggerError = (message: string) => {
    setError(message)
    setShouldShake(true)
  }

  async function handleMagicLinkSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!EMAIL_REGEX.test(email)) {
      triggerError(t('invalidEmail'))
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`,
      },
    })

    setLoading(false)
    if (signInError) {
      triggerError(signInError.message)
      return
    }

    setSent(true)
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!EMAIL_REGEX.test(email)) {
      triggerError(t('invalidEmail'))
      return
    }

    setLoading(true)
    const result = await signInWithPasswordApi(email, password)
    const errorMessage = resolvePasswordSignInError(result, t('invalidCredentials'))
    if (errorMessage) {
      setLoading(false)
      triggerError(errorMessage)
      return
    }

    router.push(nextDestination)
    router.refresh()
  }

  if (sent) {
    return (
      <AuthShell
        title={t('checkEmail')}
        description={t('checkEmailDescription', { email })}
      >
        {null}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('signInTitle')}
      description={
        mode === 'password'
          ? t('signInDescriptionPassword')
          : t('signInDescription')
      }
      footerText={t('noAccount')}
      footerHref="/auth/signup"
      footerLabel={t('signUp')}
    >
      <GoogleOAuthButton nextPath={nextPath} />

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t('or')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className={`transition-transform ${shouldShake ? 'animate-signin-shake' : ''}`}>
        {mode === 'password' ? (
          <PasswordSignInPanel
            email={email}
            error={error}
            labels={{
              email: t('email'),
              emailPlaceholder: t('emailPlaceholder'),
              forgotPassword: t('forgotPassword'),
              magicLinkTab: t('magicLinkTab'),
              password: t('password'),
              signIn: t('signIn'),
            }}
            loading={loading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handlePasswordSubmit}
            onSwitchToMagicLink={() => {
              setMode('magic-link')
              setError(null)
            }}
            password={password}
          />
        ) : (
          <MagicLinkSignInPanel
            email={email}
            error={error}
            labels={{
              email: t('email'),
              emailPlaceholder: t('emailPlaceholder'),
              passwordTab: t('passwordTab'),
              sendMagicLink: t('sendMagicLink'),
            }}
            loading={loading}
            onEmailChange={setEmail}
            onSubmit={handleMagicLinkSubmit}
            onSwitchToPassword={() => {
              setMode('password')
              setError(null)
            }}
          />
        )}
      </div>

      <p className="hidden">
        <Link href="/auth/signup">{t('signUp')}</Link>
      </p>
    </AuthShell>
  )
}
