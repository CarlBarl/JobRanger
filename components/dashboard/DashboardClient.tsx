'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { DocumentPreviewDialog } from '@/components/dashboard/DocumentPreviewDialog'
import { UploadDialog } from '@/components/dashboard/UploadDialog'
import { BatchSkillsButton } from '@/components/dashboard/BatchSkillsButton'
import { BatchResultsModal } from '@/components/dashboard/BatchResultsModal'
import { CvDocumentCard } from '@/components/dashboard/document-cards/CvDocumentCard'
import { PersonalLetterCard } from '@/components/dashboard/document-cards/PersonalLetterCard'
import { useBatchSkillsRegeneration } from '@/components/dashboard/hooks/useBatchSkillsRegeneration'

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
  cvUploadComponent: ReactNode
  personalLetterUploadComponent: ReactNode
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

  const {
    batchModalOpen,
    setBatchModalOpen,
    batchLoading,
    batchResults,
    handleBatchRegenerate,
  } = useBatchSkillsRegeneration()

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-guide-id="dashboard-documents">
        <CvDocumentCard
          document={cvDocument}
          title={t('yourCV')}
          noDocumentText={t('noCV')}
          viewDocumentLabel={t('viewDocument')}
          uploadNewLabel={t('uploadNewFile')}
          ariaLabel={`${t('viewDocument')}: ${t('yourCV')}`}
          uploadComponent={cvUploadComponent}
          onOpenPreview={() => setCvDialogOpen(true)}
          onOpenUpload={() => setCvUploadDialogOpen(true)}
        />

        <PersonalLetterCard
          document={personalLetter}
          title={t('yourPersonalLetter')}
          noDocumentText={t('noPersonalLetter')}
          viewDocumentLabel={t('viewDocument')}
          uploadNewLabel={t('uploadNewFile')}
          ariaLabel={`${t('viewDocument')}: ${t('yourPersonalLetter')}`}
          uploadComponent={personalLetterUploadComponent}
          onOpenPreview={() => setLetterDialogOpen(true)}
          onOpenUpload={() => setLetterUploadDialogOpen(true)}
        />
      </div>

      {cvDocument ? (
        <div className="mt-3 flex justify-end">
          <BatchSkillsButton onTrigger={handleBatchRegenerate} loading={batchLoading} />
        </div>
      ) : null}

      {cvDocument ? (
        <DocumentPreviewDialog
          open={cvDialogOpen}
          onOpenChange={setCvDialogOpen}
          title={t('yourCV')}
          content={cvDocument.parsedContent}
          fileUrl={cvDocument.fileUrl}
          documentId={cvDocument.id}
          type="cv"
        />
      ) : null}

      {personalLetter ? (
        <DocumentPreviewDialog
          open={letterDialogOpen}
          onOpenChange={setLetterDialogOpen}
          title={t('yourPersonalLetter')}
          content={personalLetter.parsedContent}
          fileUrl={personalLetter.fileUrl}
          documentId={personalLetter.id}
          type="personal_letter"
        />
      ) : null}

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
