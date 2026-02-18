import { useEffect, useMemo, useState } from 'react'
import { isApiFailure, isApiSuccess } from '@/lib/api/envelope'
import type {
  CvDocumentData,
  CvEditData,
  CvFeedbackData,
  CvStudioTranslations,
  SavedJobOption,
  UserTier,
} from '@/components/cv-studio/types'

type UseCvStudioStateParams = {
  userTier: UserTier
  initialCvDocuments: CvDocumentData[]
  savedJobs: SavedJobOption[]
  t: CvStudioTranslations
  onRefresh: () => void
}

export function useCvStudioState({
  userTier,
  initialCvDocuments,
  savedJobs,
  t,
  onRefresh,
}: UseCvStudioStateParams) {
  const [cvDocuments, setCvDocuments] = useState<CvDocumentData[]>(initialCvDocuments)
  const [selectedCvId, setSelectedCvId] = useState(initialCvDocuments[0]?.id ?? '')
  const [isCvPreviewOpen, setIsCvPreviewOpen] = useState(false)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [directiveText, setDirectiveText] = useState('')
  const [feedbackResult, setFeedbackResult] = useState<CvFeedbackData | null>(null)
  const [editResult, setEditResult] = useState<CvEditData | null>(null)
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPro = userTier === 'PRO'
  const hasCvDocuments = cvDocuments.length > 0

  const selectedCvDocument = useMemo(() => {
    if (!hasCvDocuments) return null
    const match = cvDocuments.find((doc) => doc.id === selectedCvId)
    return match ?? cvDocuments[0] ?? null
  }, [cvDocuments, hasCvDocuments, selectedCvId])

  const selectedCvContent = selectedCvDocument?.parsedContent ?? null
  const hasSelectedCvContent = !!selectedCvContent?.trim()

  const sortedSelectedJobIds = useMemo(
    () => [...selectedJobIds].sort((a, b) => a.localeCompare(b)),
    [selectedJobIds]
  )

  useEffect(() => {
    setCvDocuments(initialCvDocuments)
    setSelectedCvId(initialCvDocuments[0]?.id ?? '')
  }, [initialCvDocuments])

  const clearResultsAndError = () => {
    setError(null)
    setFeedbackResult(null)
    setEditResult(null)
  }

  const handleSelectCv = (nextId: string) => {
    setSelectedCvId(nextId)
    clearResultsAndError()
  }

  const toggleJob = (jobId: string) => {
    setSelectedJobIds((current) =>
      current.includes(jobId)
        ? current.filter((existing) => existing !== jobId)
        : [...current, jobId]
    )
  }

  const selectAllJobs = () => {
    setSelectedJobIds(savedJobs.map((job) => job.afJobId))
  }

  const clearSelectedJobs = () => {
    setSelectedJobIds([])
  }

  const handleUploadComplete = () => {
    clearResultsAndError()
    onRefresh()
  }

  const handleGenerateFeedback = async () => {
    if (!selectedCvDocument || isFeedbackLoading || !isPro || !hasSelectedCvContent) return

    setIsFeedbackLoading(true)
    setError(null)
    setFeedbackResult(null)

    try {
      const response = await fetch('/api/cv-feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cvDocumentId: selectedCvDocument.id,
          selectedJobIds: sortedSelectedJobIds,
          directiveText: directiveText.trim() || undefined,
        }),
      })

      const json: unknown = await response.json()
      if (!response.ok || isApiFailure(json)) {
        setError(isApiFailure(json) ? json.error.message || t('errors.feedbackFailed') : t('errors.feedbackFailed'))
        return
      }

      if (!isApiSuccess<CvFeedbackData>(json)) {
        setError(t('errors.unexpectedResponse'))
        return
      }

      setFeedbackResult(json.data)
    } catch {
      setError(t('errors.feedbackFailed'))
    } finally {
      setIsFeedbackLoading(false)
    }
  }

  const handleApplyEdits = async () => {
    if (!selectedCvDocument || isEditLoading || !isPro || !hasSelectedCvContent) return

    setIsEditLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cv-edit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cvDocumentId: selectedCvDocument.id,
          selectedJobIds: sortedSelectedJobIds,
          directiveText: directiveText.trim() || undefined,
        }),
      })

      const json: unknown = await response.json()
      if (!response.ok || isApiFailure(json)) {
        setError(isApiFailure(json) ? json.error.message || t('errors.editFailed') : t('errors.editFailed'))
        return
      }

      if (!isApiSuccess<CvEditData>(json)) {
        setError(t('errors.unexpectedResponse'))
        return
      }

      setEditResult(json.data)
      const updatedDoc: CvDocumentData = {
        id: json.data.document.id,
        createdAt: json.data.document.createdAt,
        parsedContent: json.data.document.parsedContent,
      }
      setCvDocuments((current) => [updatedDoc, ...current.filter((doc) => doc.id !== updatedDoc.id)])
      setSelectedCvId(updatedDoc.id)
      onRefresh()
    } catch {
      setError(t('errors.editFailed'))
    } finally {
      setIsEditLoading(false)
    }
  }

  return {
    isPro,
    hasCvDocuments,
    cvDocuments,
    selectedCvId,
    selectedCvDocument,
    selectedCvContent,
    hasSelectedCvContent,
    isCvPreviewOpen,
    selectedJobIds,
    directiveText,
    feedbackResult,
    editResult,
    isFeedbackLoading,
    isEditLoading,
    error,
    setDirectiveText,
    setIsCvPreviewOpen,
    handleSelectCv,
    toggleJob,
    selectAllJobs,
    clearSelectedJobs,
    handleUploadComplete,
    handleGenerateFeedback,
    handleApplyEdits,
  }
}
