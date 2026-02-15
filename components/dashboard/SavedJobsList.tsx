'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowUpRight, MapPin, Briefcase, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SavedJobData {
  afJobId: string
  headline: string
  employer: string
  location: string
  occupation: string
  deadline: string | null
  webpageUrl: string | null
  isStale: boolean
}

interface SavedJobsListProps {
  jobs: SavedJobData[]
  totalCount: number
  className?: string
}

function formatDeadline(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  })
}

export function SavedJobsList({ jobs: initialJobs, totalCount: initialCount, className }: SavedJobsListProps) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const [jobs, setJobs] = useState(initialJobs)
  const [totalCount, setTotalCount] = useState(initialCount)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleUnsave = async (afJobId: string) => {
    setRemovingId(afJobId)

    try {
      const response = await fetch(`/api/jobs/save/${afJobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.afJobId !== afJobId))
          setTotalCount((prev) => prev - 1)
          setRemovingId(null)
          router.refresh()
        }, 200)
      } else {
        setRemovingId(null)
      }
    } catch {
      setRemovingId(null)
    }
  }

  return (
    <div className={cn('card-elevated rounded-xl border bg-card p-5', className)} data-guide-id="dashboard-recent-jobs">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-foreground/70">
          {t('recentSavedJobs')}
        </h2>
        <span className="text-[11px] tabular-nums text-muted-foreground/50">
          {totalCount}
        </span>
      </div>

      <div className="mt-4">
        {jobs.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            {t('noSavedJobsYet')}
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {jobs.map((job) => (
              <div
                key={job.afJobId}
                className={cn(
                  'group flex items-start justify-between gap-3 py-3',
                  'transition-all duration-200',
                  'first:pt-0 last:pb-0',
                  '-mx-2 px-2 rounded-md',
                  removingId === job.afJobId && 'scale-95 opacity-0',
                  job.isStale ? 'opacity-60' : 'hover:bg-secondary/30'
                )}
              >
                <a
                  href={job.isStale ? undefined : (job.webpageUrl || `/jobs/${job.afJobId}`)}
                  target={!job.isStale && job.webpageUrl ? '_blank' : undefined}
                  rel={!job.isStale && job.webpageUrl ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'min-w-0 flex-1',
                    job.isStale ? 'cursor-default' : 'cursor-pointer'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'truncate text-[13px] font-medium transition-colors duration-200',
                      job.isStale
                        ? 'text-muted-foreground line-through decoration-muted-foreground/30'
                        : 'text-foreground group-hover:text-primary'
                    )}>
                      {job.headline}
                    </p>
                    {job.isStale && (
                      <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive/70">
                        {t('jobExpired')}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                    {job.employer && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Briefcase className="h-2.5 w-2.5 shrink-0" />
                        {job.employer}
                      </span>
                    )}
                    {job.location && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </a>

                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  {!job.isStale && job.deadline && (
                    <span className="text-[11px] tabular-nums text-muted-foreground/50">
                      {t('deadlineShort')} {formatDeadline(job.deadline)}
                    </span>
                  )}
                  {job.isStale && (
                    <span className="text-[11px] font-medium text-destructive/60">
                      {t('removeExpiredJob')}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUnsave(job.afJobId)
                    }}
                    title={t('unsaveJob')}
                    className={cn(
                      'rounded p-1 transition-all duration-200',
                      job.isStale
                        ? 'text-destructive/60 hover:bg-destructive/10 hover:text-destructive'
                        : 'opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive'
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalCount > 3 && (
          <div className="mt-3 border-t border-border/50 pt-3">
            <Link
              href="/jobs"
              className="link-underline text-[12px] font-medium text-muted-foreground/60 transition-colors duration-200 hover:text-foreground"
            >
              {t('viewAllJobs')} ({totalCount})
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
