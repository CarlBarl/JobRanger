'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SavedJobsPanel } from '@/components/jobs/SavedJobsPanel'
import { SearchTabPanel } from '@/components/jobs/search/SearchTabPanel'
import { useJobsSearchActions } from '@/components/jobs/search/useJobsSearchActions'
import { useJobsSearchData } from '@/components/jobs/search/useJobsSearchData'
import { useJobsSearchState } from '@/components/jobs/search/useJobsSearchState'
import { MAX_VISIBLE_CHIPS } from '@/components/jobs/search/constants'
import { buildSkillsKey, asTab } from '@/components/jobs/search/normalizers'
import { matchesLocationHint, sortByDateDesc, textRelevanceBonus } from '@/components/jobs/search/ranking'
import type { ScoredJob } from '@/components/jobs/search/types'
import { extractJobSkills, scoreJobRelevance } from '@/lib/scoring'
import { normalizeSkillKey } from '@/lib/skills/normalize'

interface JobSearchProps {
  onFirstSearch?: () => void
}

function matchesDeadlineFilter(deadline: string | null | undefined, filter: 'any' | 'open' | 'next7' | 'next30'): boolean {
  if (filter === 'any') return true
  if (!deadline) return true

  const deadlineMs = Date.parse(deadline)
  if (Number.isNaN(deadlineMs)) return true

  const nowMs = Date.now()

  if (filter === 'open') {
    return deadlineMs >= nowMs
  }

  if (filter === 'next7') {
    return deadlineMs >= nowMs && deadlineMs <= nowMs + 7 * 24 * 60 * 60 * 1000
  }

  if (filter === 'next30') {
    return deadlineMs >= nowMs && deadlineMs <= nowMs + 30 * 24 * 60 * 60 * 1000
  }

  return true
}

function matchesWorkingHoursFilter(
  label: string | null | undefined,
  filter: 'any' | 'fullTime' | 'partTime'
): boolean {
  if (filter === 'any') return true
  if (!label) return false

  const normalized = label.toLowerCase()
  if (filter === 'fullTime') return normalized.includes('heltid') || normalized.includes('full')
  if (filter === 'partTime') return normalized.includes('deltid') || normalized.includes('part')
  return true
}

export function JobSearch({ onFirstSearch }: JobSearchProps = {}) {
  const t = useTranslations('jobs')
  const controller = useJobsSearchState()
  useJobsSearchData({ t, controller })

  const {
    activeTab,
    setActiveTab,
    query,
    setQuery,
    sortOrder,
    setSortOrder,
    deadlineFilter,
    setDeadlineFilter,
    workingHoursFilter,
    setWorkingHoursFilter,
    jobs,
    error,
    loading,
    hasSearched,
    skills,
    selectedSkills,
    skillsLoading,
    skillsError,
    savedJobIds,
    savedJobs,
    savedJobsLoading,
    savedJobsError,
    selectedRegion,
    setSelectedRegion,
    searchSkillMatches,
    skillsPanelOpen,
    setSkillsPanelOpen,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    skillCatalog,
    searchPhase,
    pendingQueries,
    failedQueries,
    totalFound,
    selectedSkillSet,
    allSkillSet,
    restoringRef,
  } = controller

  const {
    handleToggleSave,
    handleUnifiedSearch,
    toggleSkill,
    handleSelectAllSkills,
    handleClearSkills,
    handleSelectTopSkills,
  } = useJobsSearchActions({
    t,
    onFirstSearch,
    controller,
  })

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!matchesDeadlineFilter(job.application_deadline, deadlineFilter)) return false
      if (!matchesWorkingHoursFilter(job.working_hours_type?.label, workingHoursFilter)) return false
      return true
    })
  }, [deadlineFilter, jobs, workingHoursFilter])

  const scoredJobs: ScoredJob[] = useMemo(() => {
    const queryLower = query.trim().toLowerCase()
    const relevanceSkills = selectedSkillSet
    const hasRelevanceSkills = relevanceSkills.length > 0
    const relevanceSkillsKey = hasRelevanceSkills ? buildSkillsKey(relevanceSkills) : ''

    const withRelevance: ScoredJob[] = filteredJobs.map((job) => {
      if (!hasRelevanceSkills) {
        if (!job.relevance && !job.relevanceSkillsKey) return job
        return { ...job, relevance: undefined, relevanceSkillsKey: undefined }
      }

      if (job.relevance && job.relevanceSkillsKey === relevanceSkillsKey) return job

      return {
        ...job,
        relevance: scoreJobRelevance(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          relevanceSkills
        ),
        relevanceSkillsKey,
      }
    })

    const getSearchSkillMatchCount = (job: ScoredJob): number => {
      const skillSearchMatches = searchSkillMatches[job.id]
      if (typeof skillSearchMatches === 'number' && skillSearchMatches > 0) {
        return skillSearchMatches
      }
      return 0
    }

    const getRelevanceMatchCount = (job: ScoredJob): number =>
      hasRelevanceSkills ? job.relevance?.matched ?? 0 : 0

    return [...withRelevance].sort((left, right) => {
      if (sortOrder === 'newest') {
        const dateDelta = sortByDateDesc(left.publication_date, right.publication_date)
        if (dateDelta !== 0) return dateDelta
      }

      const skillMatchDelta =
        getSearchSkillMatchCount(right) - getSearchSkillMatchCount(left)
      if (skillMatchDelta !== 0) return skillMatchDelta

      const relevanceMatchDelta =
        getRelevanceMatchCount(right) - getRelevanceMatchCount(left)
      if (relevanceMatchDelta !== 0) return relevanceMatchDelta

      const locationHintDelta =
        Number(matchesLocationHint(right, selectedRegion)) -
        Number(matchesLocationHint(left, selectedRegion))
      if (locationHintDelta !== 0) return locationHintDelta

      const textMatchDelta = textRelevanceBonus(right, queryLower) - textRelevanceBonus(left, queryLower)
      if (textMatchDelta !== 0) return textMatchDelta

      const dateDelta = sortByDateDesc(left.publication_date, right.publication_date)
      if (dateDelta !== 0) return dateDelta

      return left.id.localeCompare(right.id)
    })
  }, [filteredJobs, query, searchSkillMatches, selectedRegion, selectedSkillSet, sortOrder])

  const extractedSkillsByJob = useMemo(() => {
    return Object.fromEntries(
      filteredJobs.map((job) => [
        job.id,
        extractJobSkills(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          skillCatalog?.length ? skillCatalog : undefined
        ),
      ])
    )
  }, [filteredJobs, skillCatalog])

  const matchedSkillsByJob = useMemo(() => {
    const selectedKeys = new Set(selectedSkillSet.map((skill) => normalizeSkillKey(skill)))
    return Object.fromEntries(
      Object.entries(extractedSkillsByJob).map(([jobId, extractedSkills]) => [
        jobId,
        extractedSkills.filter((skill) => selectedKeys.has(normalizeSkillKey(skill))),
      ])
    )
  }, [extractedSkillsByJob, selectedSkillSet])

  useEffect(() => {
    if (restoringRef.current) return
    setCurrentPage(1)
  }, [
    deadlineFilter,
    itemsPerPage,
    selectedRegion,
    selectedSkillSet,
    sortOrder,
    workingHoursFilter,
    restoringRef,
    setCurrentPage,
  ])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(scoredJobs.length / itemsPerPage))
    setCurrentPage((previous) => Math.min(previous, maxPage))
  }, [scoredJobs.length, itemsPerPage, setCurrentPage])

  const totalPages = Math.max(1, Math.ceil(scoredJobs.length / itemsPerPage))
  const paginatedJobs = scoredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const selectedChipSummary = useMemo(() => {
    if (selectedSkillSet.length === 0) return null
    const visible = selectedSkillSet.slice(0, MAX_VISIBLE_CHIPS)
    const remaining = selectedSkillSet.length - visible.length
    return { visible, remaining }
  }, [selectedSkillSet])

  return (
    <div className="space-y-4" data-guide-id="jobs-search-root">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(asTab(value))}>
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1" data-guide-id="jobs-tab-search">
            {t('tabSearch')}
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1" data-guide-id="jobs-tab-saved">
            {t('tabSaved', { count: savedJobIds.size })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <SearchTabPanel
            labels={{
              moreSkills: (count) => t('moreSkills', { count }),
            }}
            query={query}
            onQueryChange={setQuery}
            region={selectedRegion}
            onRegionChange={setSelectedRegion}
            onSearch={handleUnifiedSearch}
            loading={loading}
            selectedSkillCount={selectedSkillSet.length}
            totalSkillCount={allSkillSet.length}
            skillsPanelOpen={skillsPanelOpen}
            onToggleSkillsPanel={() => setSkillsPanelOpen((previous) => !previous)}
            selectedChipSummary={selectedChipSummary}
            onOpenSkillsPanel={() => setSkillsPanelOpen(true)}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            deadlineFilter={deadlineFilter}
            onDeadlineFilterChange={setDeadlineFilter}
            workingHoursFilter={workingHoursFilter}
            onWorkingHoursFilterChange={setWorkingHoursFilter}
            skills={skills}
            selectedSkills={selectedSkills}
            onToggleSkill={toggleSkill}
            onSelectAllSkills={handleSelectAllSkills}
            onSelectTopSkills={handleSelectTopSkills}
            onClearSkills={handleClearSkills}
            skillsLoading={skillsLoading}
            skillsError={skillsError}
            searchPhase={searchPhase}
            totalFound={totalFound}
            pendingQueries={pendingQueries}
            failedQueries={failedQueries}
            jobs={paginatedJobs}
            hasSearched={hasSearched}
            searchSkillMatches={searchSkillMatches}
            jobSkillsByJob={extractedSkillsByJob}
            matchedSkillsByJob={matchedSkillsByJob}
            savedJobIds={savedJobIds}
            onToggleSave={handleToggleSave}
            error={error}
            pagination={{
              currentPage,
              totalPages,
              totalItems: scoredJobs.length,
              itemsPerPage,
              onPageChange: searchPhase !== 'searching' ? setCurrentPage : () => {},
              onItemsPerPageChange: searchPhase !== 'searching' ? setItemsPerPage : () => {},
            }}
          />
        </TabsContent>

        <TabsContent value="saved" data-guide-id="jobs-saved-content">
          <SavedJobsPanel
            savedJobs={savedJobs}
            loading={savedJobsLoading}
            error={savedJobsError}
            onToggleSave={handleToggleSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
