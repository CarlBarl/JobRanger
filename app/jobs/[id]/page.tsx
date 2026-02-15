import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { BackToJobsLink } from '@/components/jobs/BackToJobsLink'
import { JobActions } from '@/components/jobs/JobActions'
import { createClient } from '@/lib/supabase/server'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { getTranslations } from 'next-intl/server'

function formatLocation(address?: {
  municipality?: string | null
  region?: string | null
  country?: string | null
} | null): string | null {
  if (!address) return null
  const parts = [address.municipality, address.region, address.country]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .map((part) => part.trim())
  const uniqueParts = parts.filter(
    (part, index) =>
      parts.findIndex(
        (candidate) => candidate.toLowerCase() === part.toLowerCase()
      ) === index
  )
  return uniqueParts.length > 0 ? uniqueParts.join(', ') : null
}

function formatAddressLine(address?: {
  street_address?: string | null
  postcode?: string | null
  city?: string | null
} | null): string | null {
  if (!address) return null
  const parts = [address.street_address, address.postcode, address.city]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .map((part) => part.trim())
  return parts.length > 0 ? parts.join(', ') : null
}

function formatDate(value?: string | null): string | null {
  if (!value || value.length < 10) return null
  return value.slice(0, 10)
}

function isDeadlineSoon(deadline?: string | null): boolean {
  if (!deadline || deadline.length < 10) return false
  const deadlineDate = new Date(deadline.slice(0, 10))
  const now = new Date()
  const diffDays = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 5
}

function isDeadlinePassed(deadline?: string | null): boolean {
  if (!deadline || deadline.length < 10) return false
  const deadlineDate = new Date(deadline.slice(0, 10))
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return deadlineDate < now
}

function renderDescription(text: string) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  if (paragraphs.length <= 1) {
    const lines = text.split('\n').filter((l) => l.trim().length > 0)
    return lines.map((line, i) => (
      <p key={i} className="leading-relaxed">
        {line}
      </p>
    ))
  }
  return paragraphs.map((paragraph, i) => (
    <p key={i} className="leading-relaxed">
      {paragraph}
    </p>
  ))
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations('jobs')

  if (!user) return null

  try {
    const job = await getJobById(id)
    const title = job.headline ?? t('card.untitledRole')
    const employerName = job.employer?.name ?? t('card.unknownEmployer')
    const description = job.description?.text ?? ''
    const location = formatLocation(job.workplace_address)
    const addressLine = formatAddressLine(job.workplace_address)
    const publishedDate = formatDate(job.publication_date)
    const deadlineDate = formatDate(job.application_deadline)
    const employmentType = job.employment_type?.label ?? null
    const workingHours = job.working_hours_type?.label ?? null
    const occupation = job.occupation?.label ?? null
    const listingUrl = job.webpage_url ?? null
    const applyUrl = job.application_details?.url ?? null
    const deadlineSoon = isDeadlineSoon(job.application_deadline)
    const deadlinePassed = isDeadlinePassed(job.application_deadline)

    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-6 sm:py-8">
          {/* Back navigation */}
          <BackToJobsLink className="animate-fade-in mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('detail.backToJobs')}
          </BackToJobsLink>

          {/* Hero card */}
          <div className="animate-fade-up relative mb-8 overflow-hidden rounded-xl border bg-card">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4 sm:gap-5">
                {job.logo_url ? (
                  <img
                    src={job.logo_url}
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
                  {/* Quick tags row - visible on all screens */}
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

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
            {/* Sidebar - appears first on mobile, right column on desktop */}
            <div className="order-1 space-y-4 lg:order-2">
              <div className="lg:sticky lg:top-6">
                {/* Actions card */}
                <div className="animate-fade-up delay-1 space-y-4 rounded-xl border bg-card p-5">
                  {applyUrl ? (
                    <a
                      href={applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                    >
                      {t('detail.apply')}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3.5 10.5L10.5 3.5M10.5 3.5H5M10.5 3.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  ) : null}
                  <JobActions afJobId={id} />
                  {listingUrl ? (
                    <a
                      href={listingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {t('detail.viewListing')}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
                        <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  ) : null}
                </div>

                {/* Details card */}
                <div className="animate-fade-up delay-2 mt-4 rounded-xl border bg-card p-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('detail.keyDetails')}
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
                            {t('detail.occupationLabel')}
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
                            {t('detail.locationLabel')}
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
                            {t('detail.employmentLabel')}
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
                            {t('detail.published')}
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
                            {t('detail.deadline')}
                          </dt>
                          <dd className={`mt-0.5 font-mono text-sm tabular-nums ${deadlinePassed ? 'text-destructive' : deadlineSoon ? 'font-semibold text-orange-600 dark:text-orange-400' : ''}`}>
                            {deadlineDate}
                            {deadlinePassed ? (
                              <span className="ml-2 inline-flex rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                                {t('detail.expired')}
                              </span>
                            ) : null}
                            {!deadlinePassed && deadlineSoon ? (
                              <span className="ml-2 inline-flex rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-600 dark:text-orange-400">
                                {t('detail.closingSoon')}
                              </span>
                            ) : null}
                          </dd>
                        </div>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            </div>

            {/* Main content - description */}
            <div className="order-2 lg:order-1">
              {description ? (
                <div className="animate-fade-up delay-1 rounded-xl border bg-card p-6 sm:p-8">
                  <h2 className="mb-5 text-base font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('detail.aboutRole')}
                  </h2>
                  <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
                    {renderDescription(description)}
                  </div>
                </div>
              ) : (
                <div className="animate-fade-up delay-1 flex items-center justify-center rounded-xl border border-dashed bg-card/50 p-12">
                  <p className="text-sm text-muted-foreground">
                    {t('detail.noDescription')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('detail.loadErrorMessage')
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <BackToJobsLink className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('detail.backToJobs')}
          </BackToJobsLink>
          <div className="mx-auto max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-destructive">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold">{t('detail.loadErrorTitle')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        </main>
      </div>
    )
  }
}
