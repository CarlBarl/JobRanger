export const GUIDE_FLOW_STORAGE_KEY = 'jobranger:guide-flow'

export type GuideFlowSegment =
  | 'dashboard'
  | 'jobs'
  | 'jobs-await-detail'
  | 'job-detail'
  | 'letters'
  | 'settings'

export interface PersistedGuideFlowState {
  active: boolean
  segment: GuideFlowSegment
  jobId?: string
}

export function readGuideFlowState(): PersistedGuideFlowState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(GUIDE_FLOW_STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const active = (parsed as { active?: unknown }).active
    const segment = (parsed as { segment?: unknown }).segment
    const jobId = (parsed as { jobId?: unknown }).jobId
    if (typeof active !== 'boolean') return null
    if (
      segment !== 'dashboard' &&
      segment !== 'jobs' &&
      segment !== 'jobs-await-detail' &&
      segment !== 'job-detail' &&
      segment !== 'letters' &&
      segment !== 'settings'
    ) {
      return null
    }

    if (typeof jobId !== 'undefined' && typeof jobId !== 'string') return null

    return { active, segment, ...(jobId ? { jobId } : {}) }
  } catch {
    return null
  }
}

export function writeGuideFlowState(state: PersistedGuideFlowState) {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(GUIDE_FLOW_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage failures
  }
}

export function clearGuideFlowState() {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem(GUIDE_FLOW_STORAGE_KEY)
  } catch {
    // Ignore storage failures
  }
}
