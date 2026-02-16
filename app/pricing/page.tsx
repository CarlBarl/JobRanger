import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

type PlanCardProps = {
  name: string
  emphasized?: boolean
  usageItems: string[]
  ctaLabel: string
  ctaHref: string
}

function PlanCard({ name, emphasized = false, usageItems, ctaLabel, ctaHref }: PlanCardProps) {
  return (
    <article
      className={[
        'rounded-2xl border p-6 shadow-sm',
        emphasized ? 'border-primary/30 bg-primary/[0.06]' : 'border-border bg-card',
      ].join(' ')}
    >
      <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
      <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
        {usageItems.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6 w-full" variant={emphasized ? 'default' : 'outline'}>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </article>
  )
}

export default async function PricingPage() {
  const common = await getTranslations('common')
  const t = await getTranslations('pricing')

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
            {common('appName')}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-25" />
        <div className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full border border-primary/25 bg-primary/[0.08] blur-2xl" />

        <div className="container relative mx-auto px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/jobs"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToJobs')}
          </Link>

          <div className="max-w-2xl">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('title')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('subtitle')}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-10 lg:grid-cols-2">
            <PlanCard
              name={t('freeName')}
              ctaLabel={t('freeCta')}
              ctaHref="/auth/signin"
              usageItems={[
                t('monthlyQuotaLabel'),
                t('generateLetterQuota', { count: '1 / month' }),
                t('skillsExtractQuota', { count: '3 / month' }),
                t('skillsBatchQuota', { count: '1 / month' }),
              ]}
            />
            <PlanCard
              name={t('proName')}
              emphasized
              ctaLabel={t('proCta')}
              ctaHref="/auth/signin?plan=pro"
              usageItems={[
                t('monthlyQuotaLabel'),
                t('generateLetterQuota', { count: '200 / month' }),
                t('skillsExtractQuota', { count: '300 / month' }),
                t('skillsBatchQuota', { count: '50 / month' }),
              ]}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
