import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getSavedJobsCount, getLettersCount } from '@/lib/data/dashboard-loaders'
import { Briefcase, FileText } from 'lucide-react'

interface DashboardStatsSectionProps {
  userId: string
  userName: string | null
  userEmail: string
}

export async function DashboardStatsSection({ userId, userName, userEmail }: DashboardStatsSectionProps) {
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
        <div className="flex gap-2 sm:gap-3" data-guide-id="dashboard-quick-actions">
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
    </div>
  )
}
