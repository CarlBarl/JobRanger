import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { MonthlyQuotaSnapshot } from '@/lib/security/monthly-quota'

type QuotaRow = {
  labelKey: string
  snapshot: MonthlyQuotaSnapshot
}

interface UsageQuotaSectionProps {
  quotas: QuotaRow[]
  isFree: boolean
  resetDate: string | null
}

export async function UsageQuotaSection({ quotas, isFree, resetDate }: UsageQuotaSectionProps) {
  const t = await getTranslations('settings')

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-[13px] font-medium text-foreground/70">{t('usageTitle')}</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">{t('usageDescription')}</p>

      <div className="mt-4 space-y-2">
        {quotas.map(({ labelKey, snapshot }) => (
          <div key={labelKey} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t(labelKey)}</span>
            <span className="font-medium tabular-nums text-foreground">
              {snapshot.used}/{snapshot.limit}
            </span>
          </div>
        ))}
      </div>

      {resetDate && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {t('usageResetAt', { date: resetDate })}
        </p>
      )}

      {isFree && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {t('usageProNote')}{' '}
          <Link href="/pricing" className="font-medium text-primary hover:underline">
            {t('usageSeeProPlans')}
          </Link>
        </p>
      )}
    </section>
  )
}
