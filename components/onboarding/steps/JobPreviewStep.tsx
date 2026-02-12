'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Heart, MapPin, Briefcase, Loader2 } from 'lucide-react'

interface JobResult {
  id: string
  headline: string
  employer?: { name?: string }
  workplace_address?: { municipality?: string; region?: string }
  occupation?: { label?: string }
  webpage_url?: string
}

interface JobPreviewStepProps {
  skills: string[]
  onComplete: (savedCount: number) => void
}

export function JobPreviewStep({ skills, onComplete }: JobPreviewStepProps) {
  const t = useTranslations('onboarding.jobs')
  const [jobs, setJobs] = useState<JobResult[]>([])
  const [loading, setLoading] = useState(true)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [savingJob, setSavingJob] = useState<string | null>(null)

  const searchJobs = useCallback(async () => {
    setLoading(true)
    try {
      // Search with top skills (max 3 for preview)
      const searchSkills = skills.slice(0, 3)
      const allResults: JobResult[] = []
      const seenIds = new Set<string>()

      for (const skill of searchSkills) {
        try {
          const response = await fetch(
            `/api/jobs?q=${encodeURIComponent(skill)}&limit=5`
          )
          const data = await response.json()
          if (data.success && data.data?.hits) {
            for (const job of data.data.hits) {
              if (!seenIds.has(job.id)) {
                seenIds.add(job.id)
                allResults.push(job)
              }
            }
          }
        } catch {
          // Skip failed skill searches
        }
      }

      setJobs(allResults.slice(0, 5))
    } catch {
      // Search failed
    } finally {
      setLoading(false)
    }
  }, [skills])

  useEffect(() => {
    if (skills.length > 0) {
      searchJobs()
    } else {
      setLoading(false)
    }
  }, [skills, searchJobs])

  const handleSave = async (job: JobResult) => {
    if (savedJobs.has(job.id) || savingJob) return
    setSavingJob(job.id)

    try {
      const response = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afJobId: job.id,
          headline: job.headline,
          employer: job.employer?.name || '',
          location:
            job.workplace_address?.municipality ||
            job.workplace_address?.region ||
            '',
          occupation: job.occupation?.label || '',
        }),
      })

      if (response.ok) {
        setSavedJobs((prev) => new Set([...prev, job.id]))
      }
    } catch {
      // Allow retry
    } finally {
      setSavingJob(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        <p className="text-[14px] text-stone-500">
          {t('searching')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      {jobs.length === 0 ? (
        <p className="text-[13px] text-stone-500 text-center">
          {t('noResults')}
        </p>
      ) : (
        <div className="w-full space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group flex items-start justify-between gap-3 rounded-xl border border-stone-200/60 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:border-stone-300 hover:shadow"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-stone-800">
                  {job.headline}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-stone-500">
                  {job.employer?.name && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Briefcase className="h-2.5 w-2.5 shrink-0" />
                      {job.employer.name}
                    </span>
                  )}
                  {(job.workplace_address?.municipality ||
                    job.workplace_address?.region) && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      {job.workplace_address.municipality ||
                        job.workplace_address.region}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleSave(job)}
                disabled={savedJobs.has(job.id) || savingJob === job.id}
                className="shrink-0 rounded-lg p-1.5 transition-all duration-200"
              >
                <Heart
                  className={`h-4 w-4 transition-all duration-200 ${
                    savedJobs.has(job.id)
                      ? 'fill-red-400 text-red-400'
                      : 'text-stone-300 hover:text-red-400'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      <p className="text-center text-[12px] text-stone-500 leading-relaxed">
        {t('tip')}
      </p>

      {/* Continue */}
      <button
        onClick={() => onComplete(savedJobs.size)}
        className="h-11 rounded-xl bg-amber-600 px-8 text-[14px] font-medium text-white transition-all duration-200 hover:bg-amber-500"
      >
        {t('continue')}
      </button>
    </div>
  )
}
