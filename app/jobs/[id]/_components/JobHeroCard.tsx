interface JobHeroCardProps {
  title: string
  employerName: string
  logoUrl: string | null
  occupation: string | null
  location: string | null
  employmentType: string | null
  workingHours: string | null
}

export function JobHeroCard({
  title,
  employerName,
  logoUrl,
  occupation,
  location,
  employmentType,
  workingHours,
}: JobHeroCardProps) {
  return (
    <div className="animate-fade-up relative mb-8 overflow-hidden rounded-xl border bg-card">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-4 sm:gap-5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${employerName} logo`}
              className="h-14 w-14 shrink-0 rounded-lg border bg-white object-contain p-1 sm:h-16 sm:w-16"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 sm:h-16 sm:w-16">
              <span className="text-lg font-bold text-primary/70 sm:text-xl">
                {employerName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-bold leading-tight tracking-tight sm:text-2xl lg:text-3xl">
              {title}
            </h1>
            <p className="mt-1 break-words text-base text-muted-foreground sm:text-lg">
              {employerName}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {occupation ? (
                <span className="inline-flex items-center rounded-md bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                  {occupation}
                </span>
              ) : null}
              {location ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 opacity-60">
                    <path d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7.25 6 11 6 11S9.5 7.25 9.5 4.5C9.5 2.567 7.933 1 6 1Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="6" cy="4.5" r="1.25" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  {location}
                </span>
              ) : null}
              {employmentType || workingHours ? (
                <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {[employmentType, workingHours].filter(Boolean).join(' / ')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
