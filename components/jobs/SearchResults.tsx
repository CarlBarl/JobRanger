'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { JobCard } from '@/components/jobs/JobCard'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

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
  searchSkillMatches: Record<string, number>
  jobSkillsByJob: Record<string, string[]>
  matchedSkillsByJob: Record<string, string[]>
  savedJobIds: Set<string>
  onToggleSave: (afJobId: string) => void
  error: string | null
  pagination?: PaginationProps
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (currentPage > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  pages.push(totalPages)
  return pages
}

export function SearchResults({
  jobs,
  hasSearched,
  loading,
  searchSkillMatches,
  jobSkillsByJob,
  matchedSkillsByJob,
  savedJobIds,
  onToggleSave,
  error,
  pagination,
}: SearchResultsProps) {
  const t = useTranslations('jobs')
  const resultsRef = useRef<HTMLDivElement>(null)
  const [expandedMatchedSkills, setExpandedMatchedSkills] = useState<Set<string>>(new Set())

  const handlePageChange = useCallback(
    (page: number) => {
      if (!pagination) return
      const boundedPage = Math.max(1, Math.min(page, pagination.totalPages))
      if (boundedPage === pagination.currentPage) return
      pagination.onPageChange(boundedPage)
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [pagination]
  )

  useEffect(() => {
    setExpandedMatchedSkills(new Set())
  }, [jobs])

  const toggleMatchedSkills = useCallback((jobId: string) => {
    setExpandedMatchedSkills((prev) => {
      const next = new Set(prev)
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
        <p className="text-xs text-muted-foreground">
          {pagination && pagination.totalPages > 1
            ? t('pagination.showing', { from, to, total: pagination.totalItems })
            : t('found', { count: pagination?.totalItems ?? jobs.length })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t('enterSearch')}</p>
      )}

      {hasSearched && !loading && jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noResults')}</p>
      ) : null}

      {jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => {
            const extractedSkills = jobSkillsByJob[job.id] ?? []
            const matchedSkills = matchedSkillsByJob[job.id] ?? []
            const matchedSkillSet = new Set(matchedSkills.map((skill) => skill.toLowerCase()))
            const isExpanded = expandedMatchedSkills.has(job.id)
            const hasExtractedSkills = extractedSkills.length > 0

            return (
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

                <div className="mt-2 space-y-2 px-1">
                  <button
                    type="button"
                    onClick={() => toggleMatchedSkills(job.id)}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    {isExpanded ? t('hideJobSkills') : t('showJobSkills')}
                  </button>

                  {isExpanded ? (
                    hasExtractedSkills ? (
                      <div className="flex flex-wrap gap-1.5" data-testid={`job-skills-${job.id}`}>
                        {extractedSkills.map((skill) => {
                          const isMatched = matchedSkillSet.has(skill.toLowerCase())

                          return (
                            <span
                              key={`${job.id}-${skill}`}
                              className={
                                isMatched
                                  ? 'inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary'
                                  : 'inline-flex items-center rounded-md border border-border/60 bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
                              }
                            >
                              {skill}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">{t('noJobSkills')}</p>
                    )
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('pagination.perPage')}
            </span>
            <Select
              value={String(pagination.itemsPerPage)}
              onValueChange={(value) => pagination.onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  aria-label={t('pagination.previous')}
                  className={pagination.currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  aria-disabled={pagination.currentPage <= 1}
                  tabIndex={pagination.currentPage <= 1 ? -1 : undefined}
                  size="default"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('pagination.previous')}</span>
                </PaginationLink>
              </PaginationItem>

              {getPageNumbers(pagination.currentPage, pagination.totalPages).map((page, idx) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === pagination.currentPage}
                      onClick={() => handlePageChange(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationLink
                  aria-label={t('pagination.next')}
                  className={pagination.currentPage >= pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  aria-disabled={pagination.currentPage >= pagination.totalPages}
                  tabIndex={pagination.currentPage >= pagination.totalPages ? -1 : undefined}
                  size="default"
                >
                  <span className="hidden sm:inline">{t('pagination.next')}</span>
                  <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  )
}
