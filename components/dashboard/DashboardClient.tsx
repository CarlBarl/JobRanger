'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { DocumentPreviewDialog } from './DocumentPreviewDialog'
import { UploadDialog } from './UploadDialog'
import { BatchSkillsButton } from './BatchSkillsButton'
import { BatchResultsModal } from './BatchResultsModal'
import { useTranslations } from 'next-intl'

interface DocumentData {
  id: string
  createdAt: string
  parsedContent: string | null
  fileUrl: string | null
  skills: string[] | null
}

interface DashboardClientProps {
  cvDocument: DocumentData | null
  personalLetter: DocumentData | null
  cvUploadComponent: React.ReactNode
  personalLetterUploadComponent: React.ReactNode
}

interface BatchResults {
  total: number
  updated: Array<{
    documentId: string
    previousSkills: string[]
    newSkills: string[]
    added: string[]
    removed: string[]
    createdAt: string
  }>
  failed: Array<{
    documentId: string
    error: string
    createdAt: string
  }>
  skipped: Array<{
    documentId: string
    reason: string
    createdAt: string
  }>
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${date}, ${time}`
}

export function DashboardClient({
  cvDocument,
  personalLetter,
  cvUploadComponent,
  personalLetterUploadComponent,
}: DashboardClientProps) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const [cvDialogOpen, setCvDialogOpen] = useState(false)
  const [letterDialogOpen, setLetterDialogOpen] = useState(false)
  const [cvUploadDialogOpen, setCvUploadDialogOpen] = useState(false)
  const [letterUploadDialogOpen, setLetterUploadDialogOpen] = useState(false)
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResults, setBatchResults] = useState<BatchResults | null>(null)

  const handleCardKeyDown = (
    event: React.KeyboardEvent,
    openDialog: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDialog()
    }
  }

  const cvAriaLabel = `${t('viewDocument')}: ${t('yourCV')}`
  const personalLetterAriaLabel = `${t('viewDocument')}: ${t('yourPersonalLetter')}`

  const handleBatchRegenerate = async () => {
    setBatchLoading(true)
    try {
      const response = await fetch('/api/skills/batch', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        setBatchResults(data.data)
        setBatchModalOpen(true)
      } else {
        console.error('Batch skills regeneration failed:', data.error)
      }
    } catch (error) {
      console.error('Batch skills regeneration error:', error)
    } finally {
      setBatchLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* CV Card */}
        {cvDocument ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setCvDialogOpen(true)}
            onKeyDown={(e) => handleCardKeyDown(e, () => setCvDialogOpen(true))}
            aria-label={cvAriaLabel}
            className="card-elevated cursor-pointer rounded-xl border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-foreground/70">
                {t('yourCV')}
              </h2>
              <span className="text-[11px] tabular-nums text-muted-foreground/50">
                {formatDateTime(cvDocument.createdAt)}
              </span>
            </div>

            <div className="mt-3.5 space-y-3.5">
              <p className="text-[13px] leading-relaxed text-muted-foreground/70 line-clamp-3">
                {cvDocument.parsedContent?.substring(0, 160)}...
              </p>

              <div className="flex items-center gap-5 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
                  {t('viewDocument')}
                  <ArrowUpRight className="h-3 w-3" />
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCvUploadDialogOpen(true)
                  }}
                  className="link-underline text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {t('uploadNewFile')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-elevated rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-foreground/70">
                {t('yourCV')}
              </h2>
            </div>
            <div className="mt-3.5 space-y-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground/70">{t('noCV')}</p>
              {cvUploadComponent}
            </div>
          </div>
        )}

        {/* Personal Letter Card */}
        {personalLetter ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setLetterDialogOpen(true)}
            onKeyDown={(e) => handleCardKeyDown(e, () => setLetterDialogOpen(true))}
            aria-label={personalLetterAriaLabel}
            className="card-elevated cursor-pointer rounded-xl border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-foreground/70">
                {t('yourPersonalLetter')}
              </h2>
              <span className="text-[11px] tabular-nums text-muted-foreground/50">
                {formatDateTime(personalLetter.createdAt)}
              </span>
            </div>

            <div className="mt-3.5 space-y-3.5">
              <p className="text-[13px] leading-relaxed text-muted-foreground/70 line-clamp-3">
                {personalLetter.parsedContent?.substring(0, 160)}...
              </p>

              <div className="flex items-center gap-5 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
                  {t('viewDocument')}
                  <ArrowUpRight className="h-3 w-3" />
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setLetterUploadDialogOpen(true)
                  }}
                  className="link-underline text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {t('uploadNewFile')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-elevated rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-foreground/70">
                {t('yourPersonalLetter')}
              </h2>
            </div>
            <div className="mt-3.5 space-y-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground/70">{t('noPersonalLetter')}</p>
              {personalLetterUploadComponent}
            </div>
          </div>
        )}
      </div>

      {/* Batch button */}
      {cvDocument && (
        <div className="mt-3 flex justify-end">
          <BatchSkillsButton
            onTrigger={handleBatchRegenerate}
            loading={batchLoading}
          />
        </div>
      )}

      {/* Dialogs */}
      {cvDocument && (
        <DocumentPreviewDialog
          open={cvDialogOpen}
          onOpenChange={setCvDialogOpen}
          title={t('yourCV')}
          content={cvDocument.parsedContent}
          fileUrl={cvDocument.fileUrl}
          documentId={cvDocument.id}
          type="cv"
        />
      )}
      {personalLetter && (
        <DocumentPreviewDialog
          open={letterDialogOpen}
          onOpenChange={setLetterDialogOpen}
          title={t('yourPersonalLetter')}
          content={personalLetter.parsedContent}
          fileUrl={personalLetter.fileUrl}
          documentId={personalLetter.id}
          type="personal_letter"
        />
      )}
      <UploadDialog
        open={cvUploadDialogOpen}
        onOpenChange={setCvUploadDialogOpen}
        documentType="cv"
      />
      <UploadDialog
        open={letterUploadDialogOpen}
        onOpenChange={setLetterUploadDialogOpen}
        documentType="personal_letter"
      />
      <BatchResultsModal
        open={batchModalOpen}
        onClose={() => {
          setBatchModalOpen(false)
          router.refresh()
        }}
        results={batchResults}
      />
    </>
  )
}
