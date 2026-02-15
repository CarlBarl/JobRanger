import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

export type ApiError = { code?: string; message?: string }

export type ApiEnvelope = { success: boolean; data?: unknown; error?: ApiError }

export type DocumentRecord = {
  type?: string | null
  skills?: unknown
}

export type SavedJobRecord = {
  afJobId?: string
}

export type ScoredJob = AFJobHit & {
  relevance?: { matched: number; total: number; score: number; matchedSkills: string[] }
  relevanceSkillsKey?: string
}

export type JobsSearchTab = 'search' | 'saved'

export type JobsSearchPhase = 'idle' | 'searching' | 'complete'

export type PersistedJobsSearchState = {
  v: 1
  tab: JobsSearchTab
  query: string
  region: string
  skills: string[]
  selectedSkills: string[]
  skillsPanelOpen: boolean
  hasSearched: boolean
  jobs: ScoredJob[]
  searchSkillMatches: Record<string, number>
  error: string | null
  currentPage: number
  itemsPerPage: number
}

type SetState<T> = Dispatch<SetStateAction<T>>

export type JobsTranslations = (
  key: string,
  values?: Record<string, string | number | Date>
) => string

export interface JobsSearchStateController {
  activeTab: JobsSearchTab
  setActiveTab: SetState<JobsSearchTab>
  query: string
  setQuery: SetState<string>
  jobs: ScoredJob[]
  setJobs: SetState<ScoredJob[]>
  error: string | null
  setError: SetState<string | null>
  loading: boolean
  setLoading: SetState<boolean>
  hasSearched: boolean
  setHasSearched: SetState<boolean>
  skills: string[]
  setSkills: SetState<string[]>
  selectedSkills: string[]
  setSelectedSkills: SetState<string[]>
  skillsLoading: boolean
  setSkillsLoading: SetState<boolean>
  skillsError: string | null
  setSkillsError: SetState<string | null>
  savedJobIds: Set<string>
  setSavedJobIds: SetState<Set<string>>
  savedJobs: AFJobHit[]
  setSavedJobs: SetState<AFJobHit[]>
  savedJobsLoading: boolean
  setSavedJobsLoading: SetState<boolean>
  savedJobsError: string | null
  setSavedJobsError: SetState<string | null>
  selectedRegion: string
  setSelectedRegion: SetState<string>
  searchSkillMatches: Record<string, number>
  setSearchSkillMatches: SetState<Record<string, number>>
  skillsPanelOpen: boolean
  setSkillsPanelOpen: SetState<boolean>
  currentPage: number
  setCurrentPage: SetState<number>
  itemsPerPage: number
  setItemsPerPage: SetState<number>
  skillCatalog: string[] | null
  setSkillCatalog: SetState<string[] | null>
  searchPhase: JobsSearchPhase
  setSearchPhase: SetState<JobsSearchPhase>
  pendingQueries: number
  setPendingQueries: SetState<number>
  failedQueries: number
  setFailedQueries: SetState<number>
  totalFound: number
  setTotalFound: SetState<number>
  selectedSkillSet: string[]
  allSkillSet: string[]
  restoringRef: MutableRefObject<boolean>
  persistenceEnabledRef: MutableRefObject<boolean>
  restoredStateRef: MutableRefObject<boolean>
  firstSearchNotifiedRef: MutableRefObject<boolean>
  latestPersistedStateRef: MutableRefObject<PersistedJobsSearchState | null>
  searchRunIdRef: MutableRefObject<number>
  abortControllerRef: MutableRefObject<AbortController | null>
  jobsMapRef: MutableRefObject<Map<string, ScoredJob>>
  jobMatchedQuerySkillsRef: MutableRefObject<Map<string, Set<string>>>
  flushTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
}
