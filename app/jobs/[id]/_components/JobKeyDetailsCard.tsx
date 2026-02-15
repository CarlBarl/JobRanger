interface JobKeyDetailsCardProps {
  occupation: string | null
  location: string | null
  addressLine: string | null
  employmentType: string | null
  workingHours: string | null
  publishedDate: string | null
  deadlineDate: string | null
  deadlineSoon: boolean
  deadlinePassed: boolean
  labels: {
    title: string
    occupation: string
    location: string
    employment: string
    published: string
    deadline: string
    expired: string
    closingSoon: string
  }
}

export function JobKeyDetailsCard({
  occupation,
  location,
  addressLine,
  employmentType,
  workingHours,
  publishedDate,
  deadlineDate,
  deadlineSoon,
  deadlinePassed,
  labels,
}: JobKeyDetailsCardProps) {
  return (
    <div className="animate-fade-up delay-2 mt-4 rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {labels.title}
      </h3>

      <dl className="space-y-3.5">
        {occupation ? (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M5.5 4V2.5C5.5 1.948 5.948 1.5 6.5 1.5H9.5C10.052 1.5 10.5 1.948 10.5 2.5V4" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {labels.occupation}
              </dt>
              <dd className="mt-0.5 text-sm">{occupation}</dd>
            </div>
          </div>
        ) : null}

        {location ? (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5C4 8.75 8 14.5 8 14.5S12 8.75 12 5.5C12 3.29 10.21 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {labels.location}
              </dt>
              <dd className="mt-0.5 text-sm">{location}</dd>
              {addressLine ? (
                <dd className="mt-0.5 text-xs text-muted-foreground">{addressLine}</dd>
              ) : null}
            </div>
          </div>
        ) : null}

        {employmentType ? (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V8L11 9.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {labels.employment}
              </dt>
              <dd className="mt-0.5 text-sm">
                {[employmentType, workingHours].filter(Boolean).join(' / ')}
              </dd>
            </div>
          </div>
        ) : null}

        {publishedDate ? (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/60">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.25" />
                <path d="M5.5 1.5V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <path d="M10.5 1.5V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {labels.published}
              </dt>
              <dd className="mt-0.5 font-mono text-sm tabular-nums">{publishedDate}</dd>
            </div>
          </div>
        ) : null}

        {deadlineDate ? (
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${deadlinePassed ? 'text-destructive/60' : deadlineSoon ? 'text-orange-500/70' : 'text-muted-foreground/60'}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
                <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="currentColor" />
              </svg>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {labels.deadline}
              </dt>
              <dd className={`mt-0.5 font-mono text-sm tabular-nums ${deadlinePassed ? 'text-destructive' : deadlineSoon ? 'font-semibold text-orange-600 dark:text-orange-400' : ''}`}>
                {deadlineDate}
                {deadlinePassed ? (
                  <span className="ml-2 inline-flex rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                    {labels.expired}
                  </span>
                ) : null}
                {!deadlinePassed && deadlineSoon ? (
                  <span className="ml-2 inline-flex rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-600 dark:text-orange-400">
                    {labels.closingSoon}
                  </span>
                ) : null}
              </dd>
            </div>
          </div>
        ) : null}
      </dl>
    </div>
  )
}
