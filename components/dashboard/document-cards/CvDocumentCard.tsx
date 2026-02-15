'use client'

import { ArrowUpRight, FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDateTime } from '@/components/dashboard/document-cards/date-format'

interface DocumentData {
  id: string
  createdAt: string
  parsedContent: string | null
}

interface CvDocumentCardProps {
  document: DocumentData | null
  title: string
  noDocumentText: string
  viewDocumentLabel: string
  uploadNewLabel: string
  ariaLabel: string
  uploadComponent: ReactNode
  onOpenPreview: () => void
  onOpenUpload: () => void
}

export function CvDocumentCard({
  document,
  title,
  noDocumentText,
  viewDocumentLabel,
  uploadNewLabel,
  ariaLabel,
  uploadComponent,
  onOpenPreview,
  onOpenUpload,
}: CvDocumentCardProps) {
  if (!document) {
    return (
      <div className="card-elevated rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary/50" />
            <h2 className="text-[13px] font-medium text-foreground/70">{title}</h2>
          </div>
        </div>
        <div className="mt-3.5 space-y-3">
          <p className="text-[13px] leading-relaxed text-muted-foreground/70">{noDocumentText}</p>
          {uploadComponent}
        </div>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenPreview}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenPreview()
        }
      }}
      aria-label={ariaLabel}
      data-guide-id="dashboard-cv-card"
      className="card-elevated cursor-pointer rounded-xl border bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary/50" />
          <h2 className="text-[13px] font-medium text-foreground/70">{title}</h2>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground/50">
          {formatDateTime(document.createdAt)}
        </span>
      </div>

      <div className="mt-3.5 space-y-3.5">
        <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground/70">
          {document.parsedContent?.substring(0, 160)}...
        </p>

        <div className="flex items-center gap-5 pt-0.5" data-guide-id="dashboard-document-actions">
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
            {viewDocumentLabel}
            <ArrowUpRight className="h-3 w-3" />
          </span>
          <button
            onClick={(event) => {
              event.stopPropagation()
              onOpenUpload()
            }}
            data-guide-id="dashboard-cv-upload-new"
            className="link-underline text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            {uploadNewLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
