import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
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

    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 space-y-6">
          <header className="space-y-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-muted-foreground">{employerName}</p>
              </div>
              {job.logo_url ? (
                <img
                  src={job.logo_url}
                  alt={`${employerName} logo`}
                  className="h-16 w-16 rounded object-contain border"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {occupation ? <span>{occupation}</span> : null}
              {employmentType ? <span>{employmentType}</span> : null}
              {workingHours ? <span>{workingHours}</span> : null}
              {location ? <span>{location}</span> : null}
              {addressLine ? <span>{addressLine}</span> : null}
              {publishedDate ? (
                <span>
                  {t('detail.published')}: {publishedDate}
                </span>
              ) : null}
              {deadlineDate ? (
                <span>
                  {t('detail.deadline')}: {deadlineDate}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {applyUrl ? (
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {t('detail.apply')}
                </a>
              ) : null}
              {listingUrl ? (
                <a
                  href={listingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {t('detail.viewListing')}
                </a>
              ) : null}
            </div>
          </header>

          {description ? (
            <section className="prose max-w-none">
              <p>{description}</p>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('detail.noDescription')}
            </p>
          )}

          <JobActions afJobId={id} />
        </main>
      </div>
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('detail.loadErrorMessage')
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <h1 className="text-2xl font-bold">{t('detail.loadErrorTitle')}</h1>
          <p className="text-sm text-destructive">{message}</p>
        </main>
      </div>
    )
  }
}
