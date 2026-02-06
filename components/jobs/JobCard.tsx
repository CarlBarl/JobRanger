'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

type JobCardProps = {
  job: Pick<
    AFJobHit,
    | 'id'
    | 'headline'
    | 'employer'
    | 'workplace_address'
    | 'logo_url'
    | 'webpage_url'
    | 'publication_date'
    | 'application_deadline'
    | 'employment_type'
    | 'working_hours_type'
    | 'occupation'
  >
  isSaved?: boolean
  onToggleSave?: (afJobId: string) => void
}

function formatLocation(job: JobCardProps['job']): string | null {
  const address = job.workplace_address
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

function formatDate(value?: string | null): string | null {
  if (!value || value.length < 10) return null
  return value.slice(0, 10)
}

export function JobCard({ job, isSaved = false, onToggleSave }: JobCardProps) {
  const t = useTranslations('jobs')
  const employerName = job.employer?.name ?? t('card.unknownEmployer')
  const location = formatLocation(job)
  const publishedDate = formatDate(job.publication_date)
  const deadlineDate = formatDate(job.application_deadline)
  const employmentType = job.employment_type?.label ?? null
  const workingHours = job.working_hours_type?.label ?? null
  const occupation = job.occupation?.label ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-start gap-3">
          {job.logo_url ? (
            <img
              src={job.logo_url}
              alt={`${employerName} logo`}
              className="h-10 w-10 rounded object-contain border"
              loading="lazy"
            />
          ) : null}
          <div className="space-y-1 flex-1">
            <Link href={`/jobs/${job.id}`} className="hover:underline">
              {job.headline ?? t('card.untitledRole')}
            </Link>
            <p className="text-sm text-muted-foreground">{employerName}</p>
          </div>
          {onToggleSave ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleSave(job.id)
              }}
              className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
              aria-label={isSaved ? t('card.unsave') : t('card.save')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
                />
              </svg>
            </button>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        {occupation ? <p>{occupation}</p> : null}
        {location ? <p>{location}</p> : null}
        {employmentType || workingHours ? (
          <p>
            {[employmentType, workingHours].filter(Boolean).join(' • ')}
          </p>
        ) : null}
        {publishedDate ? (
          <p>
            {t('card.published')}: {publishedDate}
          </p>
        ) : null}
        {deadlineDate ? (
          <p>
            {t('card.deadline')}: {deadlineDate}
          </p>
        ) : null}
        {job.webpage_url ? (
          <a
            href={job.webpage_url}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-block"
          >
            {t('card.viewListing')}
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}
