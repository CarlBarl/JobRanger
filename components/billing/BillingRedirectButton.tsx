'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button, type ButtonProps } from '@/components/ui/button'

type BillingAction = 'checkout' | 'portal'

type ApiEnvelope =
  | { success: true; data: { url: string } }
  | { success: false; error?: { message?: string } }

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return !!value && typeof value === 'object' && 'success' in value
}

export function BillingRedirectButton({
  action,
  label,
  variant,
  size,
  disabled,
  className,
}: {
  action: BillingAction
  label: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
  className?: string
}) {
  const common = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endpoint = action === 'checkout' ? '/api/billing/checkout' : '/api/billing/portal'

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(endpoint, { method: 'POST' })
      const json: unknown = await response.json().catch(() => null)

      if (!response.ok || !isApiEnvelope(json) || !json.success) {
        const message =
          json && isApiEnvelope(json) && !json.success
            ? (json.error?.message ?? common('error'))
            : common('error')
        setError(message)
        return
      }

      window.location.assign(json.data.url)
    } catch {
      setError(common('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        variant={variant}
        size={size}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {common('loading')}
          </>
        ) : (
          label
        )}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

