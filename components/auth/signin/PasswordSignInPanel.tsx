'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from './LoadingSpinner'

type PasswordSignInPanelProps = {
  email: string
  error: string | null
  labels: {
    email: string
    emailPlaceholder: string
    forgotPassword: string
    magicLinkTab: string
    password: string
    signIn: string
  }
  loading: boolean
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onSubmit: (e: FormEvent) => void
  onSwitchToMagicLink: () => void
  password: string
}

export function PasswordSignInPanel({
  email,
  error,
  labels,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSwitchToMagicLink,
  password,
}: PasswordSignInPanelProps) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4"
      aria-busy={loading}
    >
      <div className="space-y-2">
        <Label htmlFor="email-password">{labels.email}</Label>
        <Input
          id="email-password"
          type="email"
          placeholder={labels.emailPlaceholder}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={loading}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
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
          {labels.signIn}
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
          onClick={onSwitchToMagicLink}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {labels.magicLinkTab}
        </button>
        <Link href="/auth/forgot" className="text-primary hover:underline">
          {labels.forgotPassword}
        </Link>
      </div>
    </form>
  )
}
