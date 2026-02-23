import {
  JOBS_SEARCH_STATE_KEY,
  JOBS_SEARCH_STATE_MAX_CHARS,
} from '@/components/jobs/search/constants'
import {
  asBoolean,
  asDeadlineFilter,
  asJobs,
  asNumber,
  asSearchSkillMatches,
  asSortOrder,
  asString,
  asStringArray,
  asTab,
  asWorkingHoursFilter,
} from '@/components/jobs/search/normalizers'
import type { PersistedJobsSearchState } from '@/components/jobs/search/types'

export function restoreJobsSearchState(): PersistedJobsSearchState | null {
  try {
    const raw = sessionStorage.getItem(JOBS_SEARCH_STATE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || (parsed as { v?: unknown }).v !== 1) {
      return null
    }

    const persisted = parsed as Partial<PersistedJobsSearchState>
    const hasMeaningfulState =
      persisted.tab === 'saved' ||
      typeof persisted.query === 'string' ||
      typeof persisted.region === 'string' ||
      Array.isArray(persisted.selectedSkills) ||
      Array.isArray(persisted.jobs)

    if (!hasMeaningfulState) {
      return null
    }

    return {
      v: 1,
      tab: asTab(persisted.tab),
      query: asString(persisted.query),
      region: asString(persisted.region),
      sortOrder: asSortOrder(persisted.sortOrder),
      deadlineFilter: asDeadlineFilter(persisted.deadlineFilter),
      workingHoursFilter: asWorkingHoursFilter(persisted.workingHoursFilter),
      skills: asStringArray(persisted.skills),
      selectedSkills: asStringArray(persisted.selectedSkills),
      skillsPanelOpen: asBoolean(persisted.skillsPanelOpen, false),
      hasSearched: asBoolean(persisted.hasSearched, false),
      jobs: asJobs(persisted.jobs),
      searchSkillMatches: asSearchSkillMatches(persisted.searchSkillMatches),
      error: typeof persisted.error === 'string' ? persisted.error : null,
      currentPage: asNumber(persisted.currentPage, 1),
      itemsPerPage: asNumber(persisted.itemsPerPage, 20),
    }
  } catch {
    return null
  }
}

export function persistJobsSearchState(payload: PersistedJobsSearchState) {
  try {
    const serialized = JSON.stringify(payload)
    if (serialized.length > JOBS_SEARCH_STATE_MAX_CHARS) {
      const compact = JSON.stringify({ ...payload, jobs: [] })
      sessionStorage.setItem(JOBS_SEARCH_STATE_KEY, compact)
      return
    }
    sessionStorage.setItem(JOBS_SEARCH_STATE_KEY, serialized)
  } catch {
    // Ignore persistence errors
  }
}

export function isMeaningfulJobsSearchState(payload: PersistedJobsSearchState): boolean {
  return (
    payload.tab === 'saved' ||
    payload.hasSearched ||
    payload.jobs.length > 0 ||
    payload.query.trim().length > 0 ||
    payload.region.trim().length > 0
  )
}
