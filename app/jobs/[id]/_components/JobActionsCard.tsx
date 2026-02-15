import { JobActions } from '@/components/jobs/JobActions'

interface JobActionsCardProps {
  jobId: string
  applyUrl: string | null
  listingUrl: string | null
  defaultGuidance: string | null
  labels: {
    apply: string
    viewListing: string
  }
}

export function JobActionsCard({
  jobId,
  applyUrl,
  listingUrl,
  defaultGuidance,
  labels,
}: JobActionsCardProps) {
  return (
    <div className="animate-fade-up delay-1 space-y-4 rounded-xl border bg-card p-5" data-guide-id="jobs-detail-actions">
      {applyUrl ? (
        <a
          href={applyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
        >
          {labels.apply}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 10.5L10.5 3.5M10.5 3.5H5M10.5 3.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      ) : null}

      <JobActions afJobId={jobId} defaultGuidance={defaultGuidance} />

      {listingUrl ? (
        <a
          href={listingUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {labels.viewListing}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
            <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      ) : null}
    </div>
  )
}
