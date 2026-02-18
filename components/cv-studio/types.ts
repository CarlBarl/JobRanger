export type UserTier = 'FREE' | 'PRO'

export interface CvDocumentData {
  id: string
  createdAt: string
  parsedContent: string | null
}

export interface SavedJobOption {
  afJobId: string
  headline: string
  employer: string | null
  location: string | null
}

export interface CvFeedbackItem {
  title: string
  priority: 'high' | 'medium' | 'low'
  rationale: string
  actions: string[]
}

export interface CvFeedbackData {
  feedback: {
    overallSummary: string
    strengths: string[]
    improvements: CvFeedbackItem[]
  }
  targeted: boolean
  usedJobCount: number
  selectedJobCount: number
  warnings: string[]
  model: string
}

export interface CvEditChange {
  section: string
  before: string
  after: string
  reason: string
}

export interface CvEditData {
  document: {
    id: string
    createdAt: string
    parsedContent: string
  }
  changes: CvEditChange[]
  targeted: boolean
  usedJobCount: number
  selectedJobCount: number
  warnings: string[]
  model: string
}

export type CvStudioTranslations = (key: string, values?: Record<string, string | number>) => string
