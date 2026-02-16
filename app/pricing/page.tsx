import Link from 'next/link'
import { Check, ChevronLeft } from 'lucide-react'
import { UserTier } from '@prisma/client'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getMonthlyQuotaLimit, USAGE_EVENT_TYPES } from '@/lib/security/monthly-quota'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

type PlanCardProps = {
  name: string
  quotaLabel: string
  items: string[]
  ctaLabel: string
  ctaHref: string
  highlighted?: boolean
}

function PlanCard({ name, quotaLabel, items, ctaLabel, ctaHref, highlighted = false }: PlanCardProps) {
  return (
    <article
      className={[
        'relative overflow-hidden rounded-2xl border p-6 shadow-sm',
        highlighted ? 'border-primary/40 bg-card shadow-md' : 'border-border bg-card',
      ].join(' ')}
    >
      {highlighted ? (
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/20 bg-primary/[0.08]" />
      ) : null}

      <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{quotaLabel}</p>

      <ul className="mt-5 space-y-2.5 text-sm text-foreground/90">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-6 w-full" variant={highlighted ? 'default' : 'outline'}>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </article>
  )
}

export default async function PricingPage() {
  const t = await getTranslations('pricing')
  const common = await getTranslations('common')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isSignedIn = !!user

  const freeGenerateLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.GENERATE_LETTER)
  const freeSkillsExtractLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.SKILLS_EXTRACT)
  const freeSkillsBatchLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.SKILLS_BATCH)

  const proGenerateLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.GENERATE_LETTER)
  const proSkillsExtractLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.SKILLS_EXTRACT)
  const proSkillsBatchLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.SKILLS_BATCH)

  const freeCtaHref = isSignedIn ? '/dashboard' : '/auth/signin'
  const proCtaHref = isSignedIn ? '/dashboard?intent=upgrade' : '/auth/signin?plan=pro'

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">{common('appName')}</span>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="relative overflow-hidden px-4 py-10 sm:px-6 sm:py-14">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-25" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full border border-primary/20 bg-primary/[0.08] blur-2xl" />

        <div className="relative mx-auto max-w-5xl space-y-8">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('backToJobs')}
          </Link>

          <header className="space-y-2 text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('subtitle')}
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <PlanCard
              name={t('freeName')}
              quotaLabel={t('monthlyQuotaLabel')}
              items={[
                t('generateLetterQuota', { count: freeGenerateLimit }),
                t('skillsExtractQuota', { count: freeSkillsExtractLimit }),
                t('skillsBatchQuota', { count: freeSkillsBatchLimit }),
              ]}
              ctaLabel={t('freeCta')}
              ctaHref={freeCtaHref}
            />
            <PlanCard
              name={t('proName')}
              quotaLabel={t('monthlyQuotaLabel')}
              items={[
                t('generateLetterQuota', { count: proGenerateLimit }),
                t('skillsExtractQuota', { count: proSkillsExtractLimit }),
                t('skillsBatchQuota', { count: proSkillsBatchLimit }),
              ]}
              ctaLabel={t('proCta')}
              ctaHref={proCtaHref}
              highlighted
            />
          </section>
        </div>
      </section>
    </main>
  )
}
