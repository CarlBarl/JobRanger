'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EMAIL_REGEX, type AuthMode } from './signin/constants'
import { resolvePasswordSignInError } from './signin/error-messages'
import { MagicLinkSignInPanel } from './signin/MagicLinkSignInPanel'
import { PasswordSignInPanel } from './signin/PasswordSignInPanel'
import { QuickSignInButton } from './signin/QuickSignInButton'
import { signInWithPasswordApi } from './signin/sign-in-api'

export function SignInForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [mode, setMode] = useState<AuthMode>('password')
  const [shouldShake, setShouldShake] = useState(false)

  const isDev = process.env.NODE_ENV === 'development'

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

    router.push('/dashboard')
    router.refresh()
  }

  async function handleQuickSignIn() {
    const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL
    const devPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD

    if (!devEmail || !devPassword) {
      setLoading(false)
      triggerError(
        'Dev credentials not configured. Set NEXT_PUBLIC_DEV_EMAIL and NEXT_PUBLIC_DEV_PASSWORD in .env.local'
      )
      return
    }

    setEmail(devEmail)
    setPassword(devPassword)
    setMode('password')
    setError(null)
    setLoading(true)

    const result = await signInWithPasswordApi(devEmail, devPassword)
    if (!result.ok) {
      setLoading(false)
      triggerError(result.rawMessage ?? 'Quick sign-in failed')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('checkEmail')}</CardTitle>
          <CardDescription>
            {t('checkEmailDescription', { email })}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card
      className={`w-full max-w-md transition-transform ${shouldShake ? 'animate-signin-shake' : ''}`}
    >
      <CardHeader>
        <CardTitle>{t('signInTitle')}</CardTitle>
        <CardDescription>
          {mode === 'password'
            ? t('signInDescriptionPassword')
            : t('signInDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/auth/signup" className="text-primary hover:underline font-medium">
            {t('signUp')}
          </Link>
        </p>

        {isDev ? (
          <QuickSignInButton
            disabled={loading}
            onClick={handleQuickSignIn}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
