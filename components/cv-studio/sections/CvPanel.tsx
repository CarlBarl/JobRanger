import { FileUpload } from '@/components/upload/FileUpload'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CvDocumentData, CvStudioTranslations } from '@/components/cv-studio/types'

function formatDateTime(iso: string) {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return '-'
  return value.toLocaleString('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  })
}

type CvPanelProps = {
  t: CvStudioTranslations
  cvDocuments: CvDocumentData[]
  selectedCvId: string
  selectedCvDocument: CvDocumentData | null
  selectedCvContent: string | null
  hasSelectedCvContent: boolean
  isCvPreviewOpen: boolean
  onSelectCv: (nextId: string) => void
  onToggleCvPreview: () => void
  onUploadComplete: () => void
}

export function CvPanel({
  t,
  cvDocuments,
  selectedCvId,
  selectedCvDocument,
  selectedCvContent,
  hasSelectedCvContent,
  isCvPreviewOpen,
  onSelectCv,
  onToggleCvPreview,
  onUploadComplete,
}: CvPanelProps) {
  return (
    <section
      className="card-elevated rounded-xl border bg-card p-5 sm:p-6"
      data-guide-id="cv-studio-current-cv"
    >
      <h2 className="text-base font-semibold text-foreground">{t('currentCvTitle')}</h2>
      {cvDocuments.length > 1 ? (
        <div className="mt-3">
          <p className="text-sm font-medium text-foreground">{t('selectCvLabel')}</p>
          <Select value={selectedCvId} onValueChange={onSelectCv}>
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
        <Button type="button" variant="outline" size="sm" onClick={onToggleCvPreview}>
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
        <FileUpload variant="embedded" onUploadComplete={onUploadComplete} />
      </div>
    </section>
  )
}
