'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CvStudioMiniGuide } from '@/components/cv-studio/CvStudioMiniGuide'
import { useCvStudioState } from '@/components/cv-studio/hooks/useCvStudioState'
import { CvPanel } from '@/components/cv-studio/sections/CvPanel'
import { DirectivesPanel } from '@/components/cv-studio/sections/DirectivesPanel'
import { ResultsPanel } from '@/components/cv-studio/sections/ResultsPanel'
import { TargetJobsPanel } from '@/components/cv-studio/sections/TargetJobsPanel'
import { FileUpload } from '@/components/upload/FileUpload'
import type { CvDocumentData, SavedJobOption, UserTier } from '@/components/cv-studio/types'
import { cn } from '@/lib/utils'

interface CvStudioClientProps {
  userTier: UserTier
  initialCvDocuments: CvDocumentData[]
  savedJobs: SavedJobOption[]
}

export function CvStudioClient({
  userTier,
  initialCvDocuments,
  savedJobs,
}: CvStudioClientProps) {
  const t = useTranslations('cvStudio')
  const router = useRouter()
  const state = useCvStudioState({
    userTier,
    initialCvDocuments,
    savedJobs,
    t,
    onRefresh: () => router.refresh(),
  })

  return (
    <div className="space-y-5">
      <CvStudioMiniGuide />
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
              state.isPro
                ? 'border-emerald-300/60 bg-emerald-50 text-emerald-700'
                : 'border-border bg-muted/40 text-muted-foreground'
            )}
          >
            {state.isPro ? t('proBadge') : t('freeBadge')}
          </span>
        </div>
      </section>

      {!state.hasCvDocuments ? (
        <section className="card-elevated rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">{t('uploadTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('uploadDescription')}</p>
          <div className="mt-4">
            <FileUpload variant="embedded" onUploadComplete={state.handleUploadComplete} />
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CvPanel
              t={t}
              cvDocuments={state.cvDocuments}
              selectedCvId={state.selectedCvId}
              selectedCvDocument={state.selectedCvDocument}
              selectedCvContent={state.selectedCvContent}
              hasSelectedCvContent={state.hasSelectedCvContent}
              isCvPreviewOpen={state.isCvPreviewOpen}
              onSelectCv={state.handleSelectCv}
              onToggleCvPreview={() => state.setIsCvPreviewOpen((current) => !current)}
              onUploadComplete={state.handleUploadComplete}
            />

            <TargetJobsPanel
              t={t}
              savedJobs={savedJobs}
              selectedJobIds={state.selectedJobIds}
              onToggleJob={state.toggleJob}
              onSelectAllJobs={state.selectAllJobs}
              onClearSelectedJobs={state.clearSelectedJobs}
            />
          </div>

          <DirectivesPanel
            t={t}
            isPro={state.isPro}
            directiveText={state.directiveText}
            isFeedbackLoading={state.isFeedbackLoading}
            isEditLoading={state.isEditLoading}
            onDirectiveTextChange={state.setDirectiveText}
            onGenerateFeedback={state.handleGenerateFeedback}
            onApplyEdits={state.handleApplyEdits}
          />
        </>
      )}

      {state.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <ResultsPanel t={t} feedbackResult={state.feedbackResult} editResult={state.editResult} />
    </div>
  )
}
