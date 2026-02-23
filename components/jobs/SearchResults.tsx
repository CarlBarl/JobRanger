'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { JobCard } from '@/components/jobs/JobCard'
import { PaginationControls } from '@/components/jobs/results/PaginationControls'
import { ResultSkillChips } from '@/components/jobs/results/ResultSkillChips'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'
import type { JobsSortOrder } from '@/components/jobs/search/types'

type ScoredJob = AFJobHit & {
  relevance?: { matched: number; total: number; score: number; matchedSkills: string[] }
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (size: number) => void
}

interface SearchResultsProps {
  jobs: ScoredJob[]
  hasSearched: boolean
  loading: boolean
  sortOrder: JobsSortOrder
  onSortOrderChange: (value: JobsSortOrder) => void
  searchSkillMatches: Record<string, number>
  jobSkillsByJob: Record<string, string[]>
  matchedSkillsByJob: Record<string, string[]>
  savedJobIds: Set<string>
  onToggleSave: (afJobId: string) => void
  error: string | null
  paginationLocked?: boolean
  pagination?: PaginationProps
}

export function SearchResults({
  jobs,
  hasSearched,
  loading,
  sortOrder,
  onSortOrderChange,
  searchSkillMatches,
  jobSkillsByJob,
  matchedSkillsByJob,
  savedJobIds,
  onToggleSave,
  error,
  paginationLocked = false,
  pagination,
}: SearchResultsProps) {
  const t = useTranslations('jobs')
  const resultsRef = useRef<HTMLDivElement>(null)
  const [expandedMatchedSkills, setExpandedMatchedSkills] = useState<Set<string>>(new Set())

  const handlePageChange = useCallback(
    (page: number) => {
      if (!pagination || paginationLocked) return
      const boundedPage = Math.max(1, Math.min(page, pagination.totalPages))
      if (boundedPage === pagination.currentPage) return
      pagination.onPageChange(boundedPage)
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [pagination, paginationLocked]
  )

  useEffect(() => {
    setExpandedMatchedSkills(new Set())
  }, [jobs])

  const toggleMatchedSkills = useCallback((jobId: string) => {
    setExpandedMatchedSkills((previous) => {
      const next = new Set(previous)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }, [])

  const from = pagination
    ? pagination.totalItems === 0
      ? 0
      : (pagination.currentPage - 1) * pagination.itemsPerPage + 1
    : 1
  const to = pagination
    ? Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)
    : jobs.length

  return (
    <div className="space-y-3" ref={resultsRef}>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {hasSearched ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {pagination && pagination.totalPages > 1
              ? t('pagination.showing', { from, to, total: pagination.totalItems })
              : t('found', { count: pagination?.totalItems ?? jobs.length })}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('sortLabel')}</span>
            <Select
              value={sortOrder}
              disabled={loading}
              onValueChange={(value) => onSortOrderChange(value as JobsSortOrder)}
            >
              <SelectTrigger
                aria-label={t('sortLabel')}
                className="h-8 w-[220px] text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bestMatch">{t('sort.bestMatch')}</SelectItem>
                <SelectItem value="newest">{t('sort.newest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('enterSearch')}</p>
      )}

      {hasSearched && !loading && jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noResults')}</p>
      ) : null}

      {jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job, index) => {
            const extractedSkills = jobSkillsByJob[job.id] ?? []
            const matchedSkills = matchedSkillsByJob[job.id] ?? []

            return (
              <div key={job.id} className="relative">
                {index === 0 ? <div data-guide-id="jobs-first-result-anchor" /> : null}

                {searchSkillMatches[job.id] ? (
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {t('skillSearchBadge', { count: searchSkillMatches[job.id] })}
                  </span>
                ) : null}

                {job.relevance && job.relevance.matched > 0 && !searchSkillMatches[job.id] ? (
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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

                <ResultSkillChips
                  jobId={job.id}
                  extractedSkills={extractedSkills}
                  matchedSkills={matchedSkills}
                  expanded={expandedMatchedSkills.has(job.id)}
                  labels={{
                    show: t('showJobSkills'),
                    hide: t('hideJobSkills'),
                    empty: t('noJobSkills'),
                  }}
                  onToggle={toggleMatchedSkills}
                />
              </div>
            )
          })}
        </div>
      ) : null}

      {pagination ? (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          locked={paginationLocked}
          labels={{
            perPage: t('pagination.perPage'),
            previous: t('pagination.previous'),
            next: t('pagination.next'),
          }}
          onPageChange={handlePageChange}
          onItemsPerPageChange={pagination.onItemsPerPageChange}
        />
      ) : null}
    </div>
  )
}
