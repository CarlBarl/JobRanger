'use client'

import { useTranslations } from 'next-intl'
import { JobCard } from '@/components/jobs/JobCard'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

type ScoredJob = AFJobHit & { relevance?: { matched: number; total: number; score: number } }

interface SearchResultsProps {
  jobs: ScoredJob[]
  hasSearched: boolean
  loading: boolean
  searchSkillMatches: Record<string, number>
  savedJobIds: Set<string>
  onToggleSave: (afJobId: string) => void
  error: string | null
}

export function SearchResults({
  jobs,
  hasSearched,
  loading,
  searchSkillMatches,
  savedJobIds,
  onToggleSave,
  error,
}: SearchResultsProps) {
  const t = useTranslations('jobs')

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {hasSearched ? (
        <p className="text-xs text-muted-foreground">
          {t('found', { count: jobs.length })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t('enterSearch')}</p>
      )}

      {hasSearched && !loading && jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noResults')}</p>
      ) : null}

      {jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <div key={job.id} className="relative">
              {searchSkillMatches[job.id] ? (
                <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t('skillSearchBadge', { count: searchSkillMatches[job.id] })}
                </span>
              ) : null}
              {job.relevance && job.relevance.matched > 0 && !searchSkillMatches[job.id] ? (
                <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t('relevanceBadge', {
                    matched: job.relevance.matched,
                    total: job.relevance.total,
                  })}
                </span>
              ) : null}
              <JobCard
                job={job}
                isSaved={savedJobIds.has(job.id)}
                onToggleSave={onToggleSave}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
