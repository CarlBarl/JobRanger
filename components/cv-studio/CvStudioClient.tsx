'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FileUpload } from '@/components/upload/FileUpload'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type UserTier = 'FREE' | 'PRO'

interface CvDocumentData {
  id: string
  createdAt: string
  parsedContent: string | null
}

interface SavedJobOption {
  afJobId: string
  headline: string
  employer: string | null
  location: string | null
}

interface CvFeedbackItem {
  title: string
  priority: 'high' | 'medium' | 'low'
  rationale: string
  actions: string[]
}

interface CvFeedbackData {
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

interface CvEditChange {
  section: string
  before: string
  after: string
  reason: string
}

interface CvEditData {
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

interface ApiFailure {
  success: false
  error: {
    code?: string
    message?: string
  }
}

interface CvStudioClientProps {
  userTier: UserTier
  initialCvDocuments: CvDocumentData[]
  savedJobs: SavedJobOption[]
}

function isApiFailure(value: unknown): value is ApiFailure {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { success?: unknown; error?: unknown }
  return candidate.success === false && !!candidate.error && typeof candidate.error === 'object'
}

function isApiSuccess<T>(value: unknown): value is { success: true; data: T } {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { success?: unknown; data?: unknown }
  return candidate.success === true && 'data' in candidate
}

function formatDateTime(iso: string) {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return '-'
  return value.toLocaleString('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  })
}

const PRIORITY_STYLE: Record<CvFeedbackItem['priority'], string> = {
  high: 'border-destructive/35 bg-destructive/5 text-destructive',
  medium: 'border-amber-300/50 bg-amber-50 text-amber-700',
  low: 'border-emerald-300/50 bg-emerald-50 text-emerald-700',
}

export function CvStudioClient({
  userTier,
  initialCvDocuments,
  savedJobs,
}: CvStudioClientProps) {
  const t = useTranslations('cvStudio')
  const router = useRouter()

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

  const handleSelectCv = (nextId: string) => {
    setSelectedCvId(nextId)
    setError(null)
    setFeedbackResult(null)
    setEditResult(null)
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
    setError(null)
    setFeedbackResult(null)
    setEditResult(null)
    router.refresh()
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
        setError(json && isApiFailure(json) ? json.error.message || t('errors.feedbackFailed') : t('errors.feedbackFailed'))
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
        setError(json && isApiFailure(json) ? json.error.message || t('errors.editFailed') : t('errors.editFailed'))
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
      setCvDocuments((current) => [
        updatedDoc,
        ...current.filter((doc) => doc.id !== updatedDoc.id),
      ])
      setSelectedCvId(updatedDoc.id)
      router.refresh()
    } catch {
      setError(t('errors.editFailed'))
    } finally {
      setIsEditLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {t('title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-1 text-xs font-medium',
              isPro
                ? 'border-emerald-300/60 bg-emerald-50 text-emerald-700'
                : 'border-border bg-muted/40 text-muted-foreground'
            )}
          >
            {isPro ? t('proBadge') : t('freeBadge')}
          </span>
        </div>
      </section>

      {!hasCvDocuments ? (
        <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">{t('uploadTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('uploadDescription')}</p>
          <div className="mt-4">
            <FileUpload variant="embedded" onUploadComplete={handleUploadComplete} />
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-foreground">{t('currentCvTitle')}</h2>
              {cvDocuments.length > 1 ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-foreground">{t('selectCvLabel')}</p>
                  <Select value={selectedCvId} onValueChange={handleSelectCv}>
                    <SelectTrigger aria-label={t('selectCvLabel')} className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cvDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {t('cvVersionLabel', { date: formatDateTime(doc.createdAt) })}{' '}
                          {doc.parsedContent
                            ? `(${doc.parsedContent.length.toLocaleString()} ${t('cvChars')})`
                            : `(${t('noCvContentShort')})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <dt>{t('cvUpdated')}</dt>
                  <dd className="font-medium text-foreground/80">
                    {selectedCvDocument ? formatDateTime(selectedCvDocument.createdAt) : '-'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>{t('cvChars')}</dt>
                  <dd className="font-medium text-foreground/80">
                    {(selectedCvContent?.length || 0).toLocaleString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCvPreviewOpen((current) => !current)}
                >
                  {isCvPreviewOpen ? t('hideCv') : t('showCv')}
                </Button>
                {selectedCvDocument ? (
                  <Button asChild type="button" variant="ghost" size="sm">
                    <a href={`/documents/${selectedCvDocument.id}`}>{t('openFull')}</a>
                  </Button>
                ) : null}
              </div>

              {isCvPreviewOpen ? (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('cvContentsTitle')}
                  </p>
                  {hasSelectedCvContent ? (
                    <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed text-foreground">
                      {selectedCvContent}
                    </pre>
                  ) : (
                    <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {t('noCvContent')}
                    </p>
                  )}
                </div>
              ) : null}
              <div className="mt-4">
                <FileUpload variant="embedded" onUploadComplete={handleUploadComplete} />
              </div>
            </section>

            <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-foreground">{t('targetsTitle')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('targetsDescription')}</p>

              {savedJobs.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  {t('noSavedJobs')}
                </p>
              ) : (
                <>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllJobs}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t('selectAllJobs')}
                    </button>
                    <span className="text-muted-foreground/50">|</span>
                    <button
                      type="button"
                      onClick={clearSelectedJobs}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t('clearJobs')}
                    </button>
                  </div>

                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                    {savedJobs.map((job) => {
                      const selected = selectedJobIds.includes(job.afJobId)

                      return (
                        <label
                          key={job.afJobId}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                            selected
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border hover:bg-muted/40'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleJob(job.afJobId)}
                            className="mt-0.5 h-4 w-4 rounded border-border"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {job.headline}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[job.employer, job.location].filter(Boolean).join(' | ')}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </>
              )}
            </section>
          </div>

          <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
            <label className="block text-sm font-medium text-foreground">{t('directivesLabel')}</label>
            <textarea
              value={directiveText}
              onChange={(event) => setDirectiveText(event.target.value)}
              placeholder={t('directivesPlaceholder')}
              rows={4}
              maxLength={1200}
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('directivesHint')}</p>

            {!isPro ? (
              <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{t('lockTitle')}</p>
                <p className="mt-1">{t('lockDescription')}</p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={handleGenerateFeedback}
                disabled={!isPro || isFeedbackLoading || isEditLoading}
                className="gap-2"
              >
                {isFeedbackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isFeedbackLoading ? t('generatingFeedback') : t('generateFeedback')}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleApplyEdits}
                disabled={!isPro || isFeedbackLoading || isEditLoading}
                className="gap-2"
              >
                {isEditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEditLoading ? t('applyingEdits') : t('applyEdits')}
              </Button>
            </div>
          </section>
        </>
      )}

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {feedbackResult ? (
        <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">{t('feedbackTitle')}</h2>
            <span className="text-xs text-muted-foreground">
              {feedbackResult.targeted ? t('targetedFeedback') : t('genericFeedback')}
            </span>
          </div>

          <p className="mt-2 text-sm text-foreground/90">{feedbackResult.feedback.overallSummary}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('strengthsTitle')}</h3>
              {feedbackResult.feedback.strengths.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('noStrengths')}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {feedbackResult.feedback.strengths.map((strength, index) => (
                    <li key={`${strength}-${index}`}>• {strength}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('improvementsTitle')}</h3>
              {feedbackResult.feedback.improvements.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('noImprovements')}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {feedbackResult.feedback.improvements.map((item, index) => (
                    <article key={`${item.title}-${index}`} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                        <span
                          className={cn(
                            'inline-flex rounded border px-2 py-0.5 text-[11px] font-medium uppercase',
                            PRIORITY_STYLE[item.priority]
                          )}
                        >
                          {item.priority === 'high'
                            ? t('priorityHigh')
                            : item.priority === 'low'
                              ? t('priorityLow')
                              : t('priorityMedium')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.rationale}</p>
                      {item.actions.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {item.actions.map((action, actionIndex) => (
                            <li key={`${action}-${actionIndex}`}>• {action}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{t('selectedJobs', { count: feedbackResult.selectedJobCount })}</span>
            <span>{t('usedJobs', { count: feedbackResult.usedJobCount })}</span>
            <span>{feedbackResult.model}</span>
          </div>

          {feedbackResult.warnings.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">{t('warningsTitle')}</p>
              <ul className="mt-1 space-y-1">
                {feedbackResult.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {editResult ? (
        <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">{t('editResultTitle')}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{t('selectedJobs', { count: editResult.selectedJobCount })}</span>
            <span>{t('usedJobs', { count: editResult.usedJobCount })}</span>
            <span>{editResult.model}</span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('changeLogTitle')}</h3>
              {editResult.changes.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('noImprovements')}</p>
              ) : (
                <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {editResult.changes.map((change, index) => (
                    <article key={`${change.section}-${index}`} className="rounded-md border border-border p-3">
                      <h4 className="text-sm font-medium text-foreground">{change.section}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{change.reason}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="rounded bg-muted/40 px-2 py-1 text-muted-foreground">
                          <strong>{t('beforeLabel')}:</strong> {change.before}
                        </p>
                        <p className="rounded bg-primary/10 px-2 py-1 text-foreground">
                          <strong>{t('afterLabel')}:</strong> {change.after}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('updatedCvTitle')}</h3>
              <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-xs leading-relaxed text-foreground">
                {editResult.document.parsedContent}
              </pre>
            </div>
          </div>

          {editResult.warnings.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">{t('warningsTitle')}</p>
              <ul className="mt-1 space-y-1">
                {editResult.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>• {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
