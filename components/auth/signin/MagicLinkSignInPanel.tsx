'use client'

import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from './LoadingSpinner'

type MagicLinkSignInPanelProps = {
  email: string
  error: string | null
  labels: {
    email: string
    emailPlaceholder: string
    passwordTab: string
    sendMagicLink: string
  }
  loading: boolean
  onEmailChange: (email: string) => void
  onSubmit: (e: FormEvent) => void
  onSwitchToPassword: () => void
}

export function MagicLinkSignInPanel({
  email,
  error,
  labels,
  loading,
  onEmailChange,
  onSubmit,
  onSwitchToPassword,
}: MagicLinkSignInPanelProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-magic">{labels.email}</Label>
        <Input
          id="email-magic"
          type="email"
          placeholder={labels.emailPlaceholder}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
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
          {labels.sendMagicLink}
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
          onClick={onSwitchToPassword}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {labels.passwordTab}
        </button>
      </div>
    </form>
  )
}
