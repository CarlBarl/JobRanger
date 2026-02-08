'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Mail, Upload } from 'lucide-react'
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
        // TODO: Show error toast/alert
        console.error('Batch skills regeneration failed:', data.error)
      }
    } catch (error) {
      // TODO: Show error toast/alert
      console.error('Batch skills regeneration error:', error)
    } finally {
      setBatchLoading(false)
    }
  }

  return (
    <>
      {/* Batch Skills Button */}
      {cvDocument && (
        <div className="mb-4 flex justify-stretch sm:justify-end">
          <BatchSkillsButton
            onTrigger={handleBatchRegenerate}
            loading={batchLoading}
          />
        </div>
      )}

      {/* CV Section */}
      <Card
        className={cvDocument ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        onClick={() => cvDocument && setCvDialogOpen(true)}
        onKeyDown={
          cvDocument
            ? (event) => handleCardKeyDown(event, () => setCvDialogOpen(true))
            : undefined
        }
        role={cvDocument ? 'button' : undefined}
        tabIndex={cvDocument ? 0 : undefined}
        aria-label={cvDocument ? cvAriaLabel : undefined}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('yourCV')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cvDocument ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('uploaded')}: {cvDocument.createdAt}
              </p>
              {cvDocument.skills && (
                <div>
                  <p className="text-xs font-medium mb-1">{t('extractedSkills')}:</p>
                  <div className="flex flex-wrap gap-1">
                    {cvDocument.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                        {skill}
                      </span>
                    ))}
                    {cvDocument.skills.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        {t('moreSkills', { count: cvDocument.skills.length - 3 })}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 sm:w-auto"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCvUploadDialogOpen(true)
                  }}
                >
                  <Upload className="h-4 w-4" />
                  {t('uploadNewFile')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('noCV')}</p>
              {cvUploadComponent}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Letter Section */}
      <Card
        className={personalLetter ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        onClick={() => personalLetter && setLetterDialogOpen(true)}
        onKeyDown={
          personalLetter
            ? (event) =>
                handleCardKeyDown(event, () => setLetterDialogOpen(true))
            : undefined
        }
        role={personalLetter ? 'button' : undefined}
        tabIndex={personalLetter ? 0 : undefined}
        aria-label={personalLetter ? personalLetterAriaLabel : undefined}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('yourPersonalLetter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personalLetter ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('uploaded')}: {personalLetter.createdAt}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {personalLetter.parsedContent?.substring(0, 150)}...
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 sm:w-auto"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLetterUploadDialogOpen(true)
                  }}
                >
                  <Upload className="h-4 w-4" />
                  {t('uploadNewFile')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('noPersonalLetter')}</p>
              {personalLetterUploadComponent}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CV Preview Dialog */}
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

      {/* Personal Letter Preview Dialog */}
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

      {/* Upload Dialogs */}
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

      {/* Batch Results Modal */}
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
