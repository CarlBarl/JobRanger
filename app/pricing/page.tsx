import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, Lock, Star } from 'lucide-react'
import { BillingProvider, UserTier } from '@/generated/prisma/client'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { getMonthlyQuotaLimit, USAGE_EVENT_TYPES } from '@/lib/security/monthly-quota'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { BillingRedirectButton } from '@/components/billing/BillingRedirectButton'
import { prisma } from '@/lib/prisma'

type FeatureRow = {
  quota: string
  description: string
  proExclusive?: boolean
}

type PlanCardProps = {
  name: string
  description: string
  priceLabel?: string
  badge?: string
  features: FeatureRow[]
  headerNote?: string
  cta: ReactNode
  highlighted?: boolean
}

function PlanCard({
  name,
  description,
  priceLabel,
  badge,
  features,
  headerNote,
  cta,
  highlighted = false,
}: PlanCardProps) {
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

      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
        {badge ? (
          <span className="inline-flex rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-0.5 text-xs font-medium text-primary">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {priceLabel ? (
        <p className="mt-2 text-sm font-medium text-foreground">{priceLabel}</p>
      ) : null}

      {headerNote ? (
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {headerNote}
        </p>
      ) : null}

      <ul className={`${headerNote ? 'mt-2' : 'mt-5'} space-y-3 text-sm`}>
        {features.map((feature) => (
          <li key={feature.quota} className="flex items-start gap-2">
            {feature.proExclusive && !highlighted ? (
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            ) : highlighted && feature.proExclusive ? (
              <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <div className="min-w-0">
              <span
                className={
                  feature.proExclusive && !highlighted
                    ? 'font-medium text-muted-foreground/50'
                    : 'font-medium text-foreground/90'
                }
              >
                {feature.quota}
              </span>
              {feature.proExclusive && !highlighted ? (
                <span className="ml-1.5 inline-flex rounded border border-muted-foreground/20 px-1.5 py-px text-[10px] font-medium uppercase text-muted-foreground/50">
                  {feature.quota.includes('Pro') ? '' : 'Pro'}
                </span>
              ) : null}
              <p
                className={
                  feature.proExclusive && !highlighted
                    ? 'mt-0.5 text-xs leading-relaxed text-muted-foreground/40'
                    : 'mt-0.5 text-xs leading-relaxed text-muted-foreground'
                }
              >
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">{cta}</div>
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
  const isSignedIn = !!user?.email
  const profile = user?.email ? await getOrCreateUser(user.id, user.email) : null
  const stripeSubscription = profile
    ? await prisma.subscription.findUnique({
        where: {
          userId_provider: { userId: profile.id, provider: BillingProvider.STRIPE },
        },
        select: {
          stripeCustomerId: true,
          status: true,
        },
      })
    : null
  const isSubscriptionActive =
    stripeSubscription?.status === 'active' || stripeSubscription?.status === 'trialing'
  const canManageSubscription = Boolean(stripeSubscription?.stripeCustomerId && isSubscriptionActive)
  const isSweden = (profile?.country ?? '').trim().toUpperCase() === 'SE'

  const freeGenerateLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.GENERATE_LETTER)
  const freeSkillsExtractLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.SKILLS_EXTRACT)
  const freeSkillsBatchLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.SKILLS_BATCH)
  const freeCvFeedbackLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.CV_FEEDBACK)
  const freeCvEditLimit = getMonthlyQuotaLimit(UserTier.FREE, USAGE_EVENT_TYPES.CV_EDIT)

  const proGenerateLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.GENERATE_LETTER)
  const proSkillsExtractLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.SKILLS_EXTRACT)
  const proSkillsBatchLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.SKILLS_BATCH)
  const proCvFeedbackLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.CV_FEEDBACK)
  const proCvEditLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.CV_EDIT)

  const freeCtaHref = isSignedIn ? '/dashboard' : '/auth/signin'
  const proSignInHref = `/auth/signin?next=${encodeURIComponent('/pricing?upgrade=1')}`

  const sharedFeatures: FeatureRow[] = [
    {
      quota: t('generateLetterQuota', { count: freeGenerateLimit }),
      description: t('generateLetterDesc'),
    },
    {
      quota: t('skillsExtractQuota', { count: freeSkillsExtractLimit }),
      description: t('skillsExtractDesc'),
    },
    {
      quota: t('skillsBatchQuota', { count: freeSkillsBatchLimit }),
      description: t('skillsBatchDesc'),
    },
  ]

  const proExclusiveFeaturesFree: FeatureRow[] = [
    {
      quota: t('cvFeedbackQuota', { count: freeCvFeedbackLimit }),
      description: t('cvFeedbackDesc'),
      proExclusive: true,
    },
    {
      quota: t('cvEditQuota', { count: freeCvEditLimit }),
      description: t('cvEditDesc'),
      proExclusive: true,
    },
  ]

  const proFeatures: FeatureRow[] = [
    {
      quota: t('generateLetterQuota', { count: proGenerateLimit }),
      description: t('generateLetterDesc'),
    },
    {
      quota: t('skillsExtractQuota', { count: proSkillsExtractLimit }),
      description: t('skillsExtractDesc'),
    },
    {
      quota: t('skillsBatchQuota', { count: proSkillsBatchLimit }),
      description: t('skillsBatchDesc'),
    },
    {
      quota: t('cvFeedbackQuota', { count: proCvFeedbackLimit }),
      description: t('cvFeedbackDesc'),
      proExclusive: true,
    },
    {
      quota: t('cvEditQuota', { count: proCvEditLimit }),
      description: t('cvEditDesc'),
      proExclusive: true,
    },
  ]

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
            <p className="mx-auto max-w-2xl text-xs text-muted-foreground">
              {t('swedenOnlyNote')}
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <PlanCard
              name={t('freeName')}
              description={t('freeDescription')}
              features={[...sharedFeatures, ...proExclusiveFeaturesFree]}
              cta={
                <Button asChild className="w-full" variant="outline">
                  <Link href={freeCtaHref}>{t('freeCta')}</Link>
                </Button>
              }
            />
            <PlanCard
              name={t('proName')}
              description={t('proDescription')}
              priceLabel={t('proPriceLabel')}
              badge={t('proHighlight')}
              headerNote={t('everythingInFree')}
              features={proFeatures}
              cta={
                !isSignedIn ? (
                  <Button asChild className="w-full">
                    <Link href={proSignInHref}>{t('proCta')}</Link>
                  </Button>
                ) : canManageSubscription ? (
                  <BillingRedirectButton
                    action="portal"
                    label={t('manageSubscriptionCta')}
                    className="w-full"
                  />
                ) : isSweden ? (
                  <BillingRedirectButton action="checkout" label={t('proCta')} className="w-full" />
                ) : (
                  <Button asChild className="w-full">
                    <Link href="/settings">{t('setSwedenCta')}</Link>
                  </Button>
                )
              }
              highlighted
            />
          </section>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="container mx-auto flex items-center justify-center gap-4 px-4 sm:px-6">
          <Link href="/terms" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            {common('termsOfService')}
          </Link>
          <Link href="/privacy" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            {common('privacyPolicy')}
          </Link>
        </div>
      </footer>
    </main>
  )
}
