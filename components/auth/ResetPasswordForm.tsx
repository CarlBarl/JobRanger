'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { updatePassword } from '@/app/auth/reset/actions'
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

export function ResetPasswordForm() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t('passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    setLoading(true)

    const result = await updatePassword(password)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Something went wrong')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('updatePasswordTitle')}</CardTitle>
        <CardDescription>{t('updatePasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? tCommon('loading') : t('updatePassword')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/signin" className="text-primary hover:underline">
            {t('backToSignIn')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
