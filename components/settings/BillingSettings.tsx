'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BillingRedirectButton } from '@/components/billing/BillingRedirectButton'

type ApiEnvelope =
  | {
      success: true
      data: {
        country?: string | null
      }
    }
  | {
      success: false
      error?: {
        message?: string
      }
    }

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return !!value && typeof value === 'object' && 'success' in value
}

export function BillingSettings({
  initialCountry,
  hasBillingProfile,
}: {
  initialCountry: string | null
  hasBillingProfile: boolean
}) {
  const t = useTranslations('settings')
  const pricing = useTranslations('pricing')

  const [country, setCountry] = useState(initialCountry)
  const [savingCountry, setSavingCountry] = useState(false)
  const [countryError, setCountryError] = useState<string | null>(null)

  const isSweden = (country ?? '').toUpperCase() === 'SE'
  const canOpenPortal = hasBillingProfile

  const handleToggleSweden = async (nextValue: boolean) => {
    if (savingCountry) return
    setSavingCountry(true)
    setCountryError(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: nextValue ? 'SE' : null }),
      })

      const json: unknown = await response.json().catch(() => null)
      if (!response.ok || !isApiEnvelope(json) || !json.success) {
        const message =
          json && isApiEnvelope(json) && !json.success
            ? (json.error?.message ?? t('billingCountrySaveFailed'))
            : t('billingCountrySaveFailed')
        setCountryError(message)
        return
      }

      const nextCountry = json.data.country ?? null
      setCountry(nextCountry)
    } catch {
      setCountryError(t('billingCountrySaveFailed'))
    } finally {
      setSavingCountry(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-[13px] font-medium text-foreground/70">{t('billingTitle')}</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">{t('billingDescription')}</p>

      <div className="mt-4 flex items-start gap-3">
        <button
          type="button"
          onClick={() => void handleToggleSweden(!isSweden)}
          disabled={savingCountry}
          className={[
            'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border',
            isSweden ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground',
            savingCountry ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
          aria-pressed={isSweden}
          aria-label={t('billingCountryToggleLabel')}
        >
          {savingCountry ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
          ) : isSweden ? (
            '✓'
          ) : null}
        </button>
        <div className="space-y-1">
          <p className="text-sm text-foreground">{t('billingCountryLabel')}</p>
          <p className="text-xs text-muted-foreground">{t('billingCountryHint')}</p>
          <p className="text-xs text-muted-foreground">{pricing('swedenOnlyNote')}</p>
          {countryError ? <p className="text-xs text-destructive">{countryError}</p> : null}
        </div>
      </div>

      <div className="mt-4">
        {canOpenPortal ? (
          <BillingRedirectButton
            action="portal"
            label={t('billingManageSubscription')}
            className="w-full"
          />
        ) : (
          <BillingRedirectButton
            action="checkout"
            label={pricing('proCta')}
            disabled={!isSweden}
            className="w-full"
          />
        )}
      </div>
    </section>
  )
}
