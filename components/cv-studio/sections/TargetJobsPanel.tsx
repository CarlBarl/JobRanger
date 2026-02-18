import { cn } from '@/lib/utils'
import type { CvStudioTranslations, SavedJobOption } from '@/components/cv-studio/types'

type TargetJobsPanelProps = {
  t: CvStudioTranslations
  savedJobs: SavedJobOption[]
  selectedJobIds: string[]
  onToggleJob: (jobId: string) => void
  onSelectAllJobs: () => void
  onClearSelectedJobs: () => void
}

export function TargetJobsPanel({
  t,
  savedJobs,
  selectedJobIds,
  onToggleJob,
  onSelectAllJobs,
  onClearSelectedJobs,
}: TargetJobsPanelProps) {
  return (
    <section
      className="card-elevated rounded-xl border bg-card p-5 sm:p-6"
      data-guide-id="cv-studio-targets"
    >
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
              onClick={onSelectAllJobs}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('selectAllJobs')}
            </button>
            <span className="text-muted-foreground/50">|</span>
            <button
              type="button"
              onClick={onClearSelectedJobs}
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
                    selected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/40'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleJob(job.afJobId)}
                    className="mt-0.5 h-4 w-4 rounded border-border"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{job.headline}</span>
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
  )
}
