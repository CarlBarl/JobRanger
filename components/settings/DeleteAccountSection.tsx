'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BillingRedirectButton } from '@/components/billing/BillingRedirectButton'

type ApiEnvelope =
  | { success: true }
  | { success: false; error?: { message?: string } }

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return !!value && typeof value === 'object' && 'success' in value
}

const CONFIRM_PHRASE = 'DELETE'

export function DeleteAccountSection({ hasActiveSubscription }: { hasActiveSubscription: boolean }) {
  const t = useTranslations('settings')
  const common = useTranslations('common')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [confirmValue, setConfirmValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canConfirm = confirmValue === CONFIRM_PHRASE && !loading

  const reset = () => {
    setConfirmValue('')
    setLoading(false)
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading) return
    setOpen(nextOpen)
    if (!nextOpen) reset()
  }

  const handleDelete = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/account/delete', { method: 'DELETE' })
      const json: unknown = await response.json().catch(() => null)

      if (!response.ok || !isApiEnvelope(json) || !json.success) {
        const message =
          json && isApiEnvelope(json) && !json.success
            ? (json.error?.message ?? t('deleteAccountRequestFailed'))
            : t('deleteAccountRequestFailed')
        setError(message)
        return
      }

      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // Ignore local sign-out errors; account is already deleted server-side.
      }

      setOpen(false)
      router.push('/')
      router.refresh()
    } catch {
      setError(t('deleteAccountRequestFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-destructive/25 bg-card p-5">
      <h2 className="text-[13px] font-medium text-destructive/80">{t('dangerZoneTitle')}</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">{t('dangerZoneDescription')}</p>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{t('deleteAccountTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('deleteAccountDescription')}</p>

        {hasActiveSubscription ? (
          <div className="rounded-lg border border-border/60 bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              {t('deleteAccountBlockedTitle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('deleteAccountBlockedBody')}
            </p>
            <div className="mt-3">
              <BillingRedirectButton
                action="portal"
                label={t('billingManageSubscription')}
                className="w-full"
              />
            </div>
            <div className="mt-3">
              <Button type="button" variant="destructive" className="w-full" disabled>
                {t('deleteAccountButton')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setOpen(true)}
            >
              {t('deleteAccountButton')}
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('deleteAccountConfirmTitle')}</DialogTitle>
                  <DialogDescription>{t('deleteAccountConfirmBody')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="delete-confirm">
                    {t('deleteAccountConfirmLabel')}
                  </label>
                  <Input
                    id="delete-confirm"
                    value={confirmValue}
                    onChange={(e) => setConfirmValue(e.target.value)}
                    placeholder={t('deleteAccountConfirmPlaceholder')}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">{t('deleteAccountConfirmHint')}</p>
                </div>

                {error ? <p className="text-xs text-destructive">{error}</p> : null}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={loading}
                  >
                    {common('cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleDelete()}
                    disabled={!canConfirm}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {common('loading')}
                      </>
                    ) : (
                      t('deleteAccountConfirmButton')
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </section>
  )
}

