import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getSavedJobsCount, getLettersCount } from '@/lib/data/dashboard-loaders'

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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-medium tracking-[-0.01em] text-foreground">
          {userName || userEmail}
        </h1>
        {userName && (
          <p className="mt-0.5 text-[13px] text-muted-foreground/60">{userEmail}</p>
        )}
      </div>
      <div className="flex gap-6">
        <Link
          href="/jobs"
          className="group flex items-baseline gap-1.5 transition-colors duration-200 hover:opacity-80"
        >
          <span className="text-lg font-medium tabular-nums text-foreground">{savedJobsCount}</span>
          <span className="text-[11px] font-normal text-muted-foreground/60 transition-colors duration-200 group-hover:text-foreground">
            {t('jobsSaved')}
          </span>
        </Link>
        <Link
          href="/letters"
          className="group flex items-baseline gap-1.5 transition-colors duration-200 hover:opacity-80"
        >
          <span className="text-lg font-medium tabular-nums text-foreground">{lettersCount}</span>
          <span className="text-[11px] font-normal text-muted-foreground/60 transition-colors duration-200 group-hover:text-foreground">
            {t('lettersGenerated')}
          </span>
        </Link>
      </div>
    </div>
  )
}
