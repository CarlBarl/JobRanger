import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { UserTier } from '@/generated/prisma/client'
import { getSavedJobsCount, getLettersCount } from '@/lib/data/dashboard-loaders'
import { Briefcase, FileText, Settings, Sparkles, ArrowRight } from 'lucide-react'
import { DismissibleUpgradeCard } from './DismissibleUpgradeCard'

interface DashboardStatsSectionProps {
  userId: string
  userName: string | null
  userEmail: string
  userTier: UserTier
}

export async function DashboardStatsSection({ userId, userName, userEmail, userTier }: DashboardStatsSectionProps) {
  const t = await getTranslations('dashboard')
  const [savedJobsCount, lettersCount] = await Promise.all([
    getSavedJobsCount(userId),
    getLettersCount(userId),
  ])

  return (
    <div
      className="rounded-2xl border border-primary/[0.08] bg-gradient-to-br from-primary/[0.03] to-transparent p-4 sm:p-6"
      data-guide-id="dashboard-stats"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
            {userName || userEmail}
          </h1>
          {userName && (
            <p className="mt-0.5 text-[13px] text-muted-foreground/60">{userEmail}</p>
          )}
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link
            href="/jobs"
            className="group flex flex-1 items-center gap-2.5 rounded-xl border border-border/50 bg-card/80 px-3 py-2 transition-all duration-200 hover:border-border hover:shadow-sm sm:flex-none sm:px-4 sm:py-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <span className="block text-lg font-semibold tabular-nums leading-tight text-foreground">{savedJobsCount}</span>
              <span className="block whitespace-nowrap text-[11px] text-muted-foreground/60">{t('jobsSaved')}</span>
            </div>
          </Link>
          <Link
            href="/letters"
            className="group flex flex-1 items-center gap-2.5 rounded-xl border border-border/50 bg-card/80 px-3 py-2 transition-all duration-200 hover:border-border hover:shadow-sm sm:flex-none sm:px-4 sm:py-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-2/[0.08]">
              <FileText className="h-3.5 w-3.5 text-chart-2" />
            </div>
            <div>
              <span className="block text-lg font-semibold tabular-nums leading-tight text-foreground">{lettersCount}</span>
              <span className="block whitespace-nowrap text-[11px] text-muted-foreground/60">{t('lettersGenerated')}</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-4" data-guide-id="dashboard-quick-actions">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          {t('quickLinksTitle')}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link
            href="/cv-studio"
            data-guide-id="dashboard-quick-link-cv-studio"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/70 px-3 py-2 text-[13px] text-foreground transition-colors hover:border-border hover:bg-card"
          >
            <Sparkles className="h-3.5 w-3.5 text-chart-2" />
            {t('quickLinkCvStudio')}
          </Link>
          <Link
            href="/letters"
            data-guide-id="dashboard-quick-link-letters"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/70 px-3 py-2 text-[13px] text-foreground transition-colors hover:border-border hover:bg-card"
          >
            <FileText className="h-3.5 w-3.5 text-chart-2" />
            {t('quickLinkLetters')}
          </Link>
          <Link
            href="/settings"
            data-guide-id="dashboard-quick-link-settings"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/70 px-3 py-2 text-[13px] text-foreground transition-colors hover:border-border hover:bg-card"
          >
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            {t('quickLinkSettings')}
          </Link>
        </div>
      </div>

      {userTier === 'FREE' && (
        <DismissibleUpgradeCard dismissLabel={t('upgradeCard.dismiss')}>
          <div className="flex flex-wrap items-center gap-4 p-4 pr-20 sm:flex-nowrap sm:gap-5 sm:p-5 sm:pr-20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100/80">
              <Sparkles className="h-[18px] w-[18px] text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-600/80">
                {t('upgradeCard.badge')}
              </p>
              <p className="mt-1 text-[13px] font-medium text-foreground">
                {t('upgradeCard.included')}
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {t('upgradeCard.valueProp')}
              </p>
            </div>
            <Link
              href="/pricing"
              className="pro-cta inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white shadow-sm"
            >
              {t('upgradeCard.cta')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </DismissibleUpgradeCard>
      )}
    </div>
  )
}
