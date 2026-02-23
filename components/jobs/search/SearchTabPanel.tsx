'use client'

import { SearchBar } from '@/components/jobs/SearchBar'
import { SkillSelector } from '@/components/jobs/SkillSelector'
import { SearchResults } from '@/components/jobs/SearchResults'
import { SearchStatusBar } from '@/components/jobs/SearchStatusBar'
import { cn } from '@/lib/utils'
import type { JobsSortOrder, ScoredJob } from '@/components/jobs/search/types'

interface SearchTabPanelProps {
  labels: {
    moreSkills: (count: number) => string
  }
  query: string
  onQueryChange: (query: string) => void
  region: string
  onRegionChange: (region: string) => void
  onSearch: () => void
  sortOrder: JobsSortOrder
  onSortOrderChange: (value: JobsSortOrder) => void
  loading: boolean
  selectedSkillCount: number
  totalSkillCount: number
  skillsPanelOpen: boolean
  onToggleSkillsPanel: () => void
  selectedChipSummary: { visible: string[]; remaining: number } | null
  onOpenSkillsPanel: () => void
  skills: string[]
  selectedSkills: string[]
  onToggleSkill: (skill: string) => void
  onSelectAllSkills: () => void
  onSelectTopSkills: () => void
  onClearSkills: () => void
  skillsLoading: boolean
  skillsError: string | null
  searchPhase: 'idle' | 'searching' | 'complete'
  totalFound: number
  pendingQueries: number
  failedQueries: number
  jobs: ScoredJob[]
  hasSearched: boolean
  searchSkillMatches: Record<string, number>
  jobSkillsByJob: Record<string, string[]>
  matchedSkillsByJob: Record<string, string[]>
  savedJobIds: Set<string>
  onToggleSave: (afJobId: string) => void
  error: string | null
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    onItemsPerPageChange: (size: number) => void
  }
}

export function SearchTabPanel({
  labels,
  query,
  onQueryChange,
  region,
  onRegionChange,
  onSearch,
  sortOrder,
  onSortOrderChange,
  loading,
  selectedSkillCount,
  totalSkillCount,
  skillsPanelOpen,
  onToggleSkillsPanel,
  selectedChipSummary,
  onOpenSkillsPanel,
  skills,
  selectedSkills,
  onToggleSkill,
  onSelectAllSkills,
  onSelectTopSkills,
  onClearSkills,
  skillsLoading,
  skillsError,
  searchPhase,
  totalFound,
  pendingQueries,
  failedQueries,
  jobs,
  hasSearched,
  searchSkillMatches,
  jobSkillsByJob,
  matchedSkillsByJob,
  savedJobIds,
  onToggleSave,
  error,
  pagination,
}: SearchTabPanelProps) {
  return (
    <div className="space-y-3" data-guide-id="jobs-search-content">
      <SearchBar
        query={query}
        onQueryChange={onQueryChange}
        region={region}
        onRegionChange={onRegionChange}
        onSearch={onSearch}
        loading={loading}
        selectedSkillCount={selectedSkillCount}
        totalSkillCount={totalSkillCount}
        skillsPanelOpen={skillsPanelOpen}
        onToggleSkillsPanel={onToggleSkillsPanel}
      />

      {selectedChipSummary && !skillsPanelOpen ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedChipSummary.visible.map((skill) => (
            <span
              key={skill}
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5',
                'border border-primary/30 bg-primary/10 text-[11px] font-medium text-primary'
              )}
            >
              {skill}
            </span>
          ))}
          {selectedChipSummary.remaining > 0 ? (
            <button
              type="button"
              onClick={onOpenSkillsPanel}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              {labels.moreSkills(selectedChipSummary.remaining)}
            </button>
          ) : null}
        </div>
      ) : null}

      <SkillSelector
        skills={skills}
        selectedSkills={selectedSkills}
        onToggleSkill={onToggleSkill}
        onSelectAll={onSelectAllSkills}
        onSelectTop={onSelectTopSkills}
        onClearAll={onClearSkills}
        loading={loading}
        isOpen={skillsPanelOpen}
        skillsLoading={skillsLoading}
        skillsError={skillsError}
      />

      <SearchStatusBar
        phase={searchPhase}
        totalFound={totalFound}
        pendingQueries={pendingQueries}
        failedQueries={failedQueries}
      />

      <SearchResults
        jobs={jobs}
        hasSearched={hasSearched}
        loading={loading}
        searchSkillMatches={searchSkillMatches}
        jobSkillsByJob={jobSkillsByJob}
        matchedSkillsByJob={matchedSkillsByJob}
        savedJobIds={savedJobIds}
        onToggleSave={onToggleSave}
        error={error}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        paginationLocked={searchPhase === 'searching'}
        pagination={pagination}
      />
    </div>
  )
}
