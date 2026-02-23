'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

function sanitizeNextPath(rawNext: string | undefined) {
  if (!rawNext) return '/dashboard'
  if (!rawNext.startsWith('/')) return '/dashboard'
  if (rawNext.startsWith('//')) return '/dashboard'
  if (/[\r\n]/.test(rawNext)) return '/dashboard'
  return rawNext
}

export function GoogleOAuthButton({ nextPath }: { nextPath?: string }) {
  const t = useTranslations('auth')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextDestination = sanitizeNextPath(nextPath)

  async function handleClick() {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`,
      },
    })

    if (signInError) {
      setLoading(false)
      setError(signInError.message)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? t('signingIn') : t('continueWithGoogle')}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

