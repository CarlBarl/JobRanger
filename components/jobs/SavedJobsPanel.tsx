'use client'

import { useTranslations } from 'next-intl'
import { JobCard } from '@/components/jobs/JobCard'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

interface SavedJobsPanelProps {
  savedJobs: AFJobHit[]
  loading: boolean
  error: string | null
  onToggleSave: (afJobId: string) => void
}

export function SavedJobsPanel({
  savedJobs,
  loading,
  error,
  onToggleSave,
}: SavedJobsPanelProps) {
  const t = useTranslations('jobs')

  if (loading) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        {t('savedJobsLoading')}
      </p>
    )
  }

  if (error) {
    return <p className="py-4 text-sm text-destructive">{error}</p>
  }

  if (savedJobs.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        {t('savedJobsEmpty')}
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {savedJobs.map((job) => (
        <JobCard
          key={`saved-${job.id}`}
          job={job}
          isSaved
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  )
}
