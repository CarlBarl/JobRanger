import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { BackToJobsLink } from '@/components/jobs/BackToJobsLink'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { getTranslations } from 'next-intl/server'
import { JobHeroCard } from '@/app/jobs/[id]/_components/JobHeroCard'
import { JobActionsCard } from '@/app/jobs/[id]/_components/JobActionsCard'
import { JobKeyDetailsCard } from '@/app/jobs/[id]/_components/JobKeyDetailsCard'
import { renderDescription } from '@/app/jobs/[id]/_lib/job-description'
import {
  formatAddressLine,
  formatDate,
  formatLocation,
  isDeadlinePassed,
  isDeadlineSoon,
} from '@/app/jobs/[id]/_lib/job-detail-formatters'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations('jobs')

  if (!user) return null

  const profile = user.email ? await getOrCreateUser(user.id, user.email) : null

  try {
    const [job, existingLettersCount, savedJob] = await Promise.all([
      getJobById(id),
      prisma.generatedLetter.count({
        where: {
          userId: user.id,
          afJobId: id,
        },
      }),
      prisma.savedJob.findUnique({
        where: {
          userId_afJobId: {
            userId: user.id,
            afJobId: id,
          },
        },
        select: { id: true },
      }),
    ])
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
        <main className="container mx-auto px-4 py-6 sm:py-8" data-guide-id="jobs-detail-main">
          <BackToJobsLink className="animate-fade-in mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('detail.backToJobs')}
          </BackToJobsLink>

          <JobHeroCard
            title={title}
            employerName={employerName}
            logoUrl={job.logo_url ?? null}
            occupation={occupation}
            location={location}
            employmentType={employmentType}
            workingHours={workingHours}
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
            <div className="order-1 space-y-4 lg:order-2">
              <div className="lg:sticky lg:top-6">
                <JobActionsCard
                  jobId={id}
                  initialSaved={Boolean(savedJob)}
                  applyUrl={applyUrl}
                  listingUrl={listingUrl}
                  defaultGuidance={profile?.letterGuidanceDefault ?? null}
                  existingLettersCount={existingLettersCount}
                  labels={{
                    apply: t('detail.apply'),
                    viewListing: t('detail.viewListing'),
                  }}
                />

                <JobKeyDetailsCard
                  occupation={occupation}
                  location={location}
                  addressLine={addressLine}
                  employmentType={employmentType}
                  workingHours={workingHours}
                  publishedDate={publishedDate}
                  deadlineDate={deadlineDate}
                  deadlineSoon={deadlineSoon}
                  deadlinePassed={deadlinePassed}
                  labels={{
                    title: t('detail.keyDetails'),
                    occupation: t('detail.occupationLabel'),
                    location: t('detail.locationLabel'),
                    employment: t('detail.employmentLabel'),
                    published: t('detail.published'),
                    deadline: t('detail.deadline'),
                    expired: t('detail.expired'),
                    closingSoon: t('detail.closingSoon'),
                  }}
                />
              </div>
            </div>

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
