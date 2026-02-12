'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthMode = 'password' | 'magic-link'

function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width="18"
      height="18"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

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

  // Handle shake animation removal
  useEffect(() => {
    if (shouldShake) {
      const timeout = setTimeout(() => setShouldShake(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [shouldShake])

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!EMAIL_REGEX.test(email)) {
      setError(t('invalidEmail'))
      setShouldShake(true)
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
      setError(signInError.message)
      setShouldShake(true)
      return
    }

    setSent(true)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!EMAIL_REGEX.test(email)) {
      setError(t('invalidEmail'))
      setShouldShake(true)
      return
    }

    setLoading(true)

    let signInErrorMessage: string | null = null

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = (await response.json()) as
        | { success: true }
        | { success: false; error?: { message?: string } }

      if (!response.ok || !result.success) {
        const rawMessage = !result.success ? result.error?.message : undefined
        if (
          rawMessage &&
          rawMessage.toLowerCase().includes('invalid login credentials')
        ) {
          signInErrorMessage = t('invalidCredentials')
        } else {
          signInErrorMessage = rawMessage ?? t('invalidCredentials')
        }
      }
    } catch {
      signInErrorMessage = t('invalidCredentials')
    }

    if (signInErrorMessage) {
      setLoading(false)
      setError(signInErrorMessage)
      setShouldShake(true)
      return
    }

    // Success - redirect immediately
    router.push('/dashboard')
    router.refresh()
  }

  async function handleQuickSignIn() {
    const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL
    const devPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD
    if (!devEmail || !devPassword) {
      setLoading(false)
      setError('Dev credentials not configured. Set NEXT_PUBLIC_DEV_EMAIL and NEXT_PUBLIC_DEV_PASSWORD in .env.local')
      return
    }

    setEmail(devEmail)
    setPassword(devPassword)
    setMode('password')
    setError(null)
    setLoading(true)

    let signInErrorMessage: string | null = null

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: devEmail, password: devPassword }),
      })

      const result = (await response.json()) as
        | { success: true }
        | { success: false; error?: { message?: string } }

      if (!response.ok || !result.success) {
        const rawMessage = !result.success ? result.error?.message : undefined
        signInErrorMessage = rawMessage ?? 'Quick sign-in failed'
      }
    } catch {
      signInErrorMessage = 'Quick sign-in failed'
    }

    if (signInErrorMessage) {
      setLoading(false)
      setError(signInErrorMessage)
      setShouldShake(true)
      return
    }

    // Success - redirect immediately
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
          <form
            onSubmit={handlePasswordSubmit}
            noValidate
            className="space-y-4"
            aria-busy={loading}
          >
            <div className="space-y-2">
              <Label htmlFor="email-password">{t('email')}</Label>
              <Input
                id="email-password"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive animate-signin-fade-up">{error}</p>
            ) : null}
            <Button
              type="submit"
              className="w-full relative"
              disabled={loading}
            >
              <span className={loading ? 'opacity-0' : 'opacity-100'}>
                {t('signIn')}
              </span>
              {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner />
                </span>
              )}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode('magic-link')
                  setError(null)
                }}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t('magicLinkTab')}
              </button>
              <Link href="/auth/forgot" className="text-primary hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagicLinkSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-magic">{t('email')}</Label>
              <Input
                id="email-magic"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive animate-signin-fade-up">{error}</p>
            ) : null}
            <Button
              type="submit"
              className="w-full relative"
              disabled={loading}
            >
              <span className={loading ? 'opacity-0' : 'opacity-100'}>
                {t('sendMagicLink')}
              </span>
              {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner />
                </span>
              )}
            </Button>
            <div className="text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode('password')
                  setError(null)
                }}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t('passwordTab')}
              </button>
            </div>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/auth/signup" className="text-primary hover:underline font-medium">
            {t('signUp')}
          </Link>
        </p>
        {isDev && (
          <div className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleQuickSignIn}
              disabled={loading}
            >
              🚀 Quick Sign In (Dev)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
