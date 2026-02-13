'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Heart, MapPin, Briefcase, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { scoreJobRelevance } from '@/lib/scoring'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

interface JobPreviewStepProps {
  skills: string[]
  onComplete: (savedCount: number) => void
}

function sortByDateDesc(left?: string | null, right?: string | null): number {
  const leftDate = Date.parse(left ?? '')
  const rightDate = Date.parse(right ?? '')
  const safeLeft = Number.isNaN(leftDate) ? 0 : leftDate
  const safeRight = Number.isNaN(rightDate) ? 0 : rightDate
  return safeRight - safeLeft
}

function normalizeRegion(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesRegionFilter(jobRegion: string | null | undefined, selectedRegion: string): boolean {
  const normalizedSelected = normalizeRegion(selectedRegion)
  if (!normalizedSelected) return true

  const normalizedJobRegion = normalizeRegion(jobRegion ?? '')
  if (!normalizedJobRegion) return false

  return (
    normalizedJobRegion === normalizedSelected ||
    normalizedJobRegion.includes(normalizedSelected) ||
    normalizedSelected.includes(normalizedJobRegion)
  )
}

const MAX_PREVIEW_JOBS = 8
const MAX_SEARCH_SKILLS = 5

export function JobPreviewStep({ skills, onComplete }: JobPreviewStepProps) {
  const t = useTranslations('onboarding.jobs')
  const [jobs, setJobs] = useState<AFJobHit[]>([])
  const [skillMatches, setSkillMatches] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [selectedRegion, setSelectedRegion] = useState('')

  const availableRegions = useMemo(() => {
    const regions = jobs
      .map((job) => job.workplace_address?.region)
      .filter((r): r is string => !!r && r.trim().length > 0)
    return Array.from(new Set(regions)).sort()
  }, [jobs])

  const filteredJobs = useMemo(() => {
    if (!selectedRegion) return jobs
    return jobs.filter((job) => {
      const address = job.workplace_address
      const candidates = [
        address?.region,
        address?.municipality,
        address?.city,
        address?.country,
      ]

      return candidates.some((value) => matchesRegionFilter(value, selectedRegion))
    })
  }, [jobs, selectedRegion])

  const searchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)

    const searchSkills = Array.from(
      new Set(
        skills
          .map((skill) => skill.trim())
          .filter(Boolean)
      )
    ).slice(0, MAX_SEARCH_SKILLS)

    try {
      const settled = await Promise.allSettled(
        searchSkills.map(async (skill) => ({
          skill,
          hits: await fetchBySkill(skill),
        }))
      )

      const successfulSearches = settled.filter(
        (result): result is PromiseFulfilledResult<{ skill: string; hits: AFJobHit[] }> =>
          result.status === 'fulfilled'
      )

      if (successfulSearches.length === 0) {
        setJobs([])
        setSkillMatches({})
        setError(t('noResults'))
        return
      }

      const merged = new Map<string, { job: AFJobHit; skills: Set<string> }>()
      for (const result of successfulSearches) {
        for (const hit of result.value.hits) {
          const existing = merged.get(hit.id)
          if (existing) {
            existing.skills.add(result.value.skill)
          } else {
            merged.set(hit.id, {
              job: hit,
              skills: new Set([result.value.skill]),
            })
          }
        }
      }

      const sortedJobs = Array.from(merged.values())
        .map((entry) => ({
          ...entry,
          relevance: scoreJobRelevance(
            {
              headline: entry.job.headline,
              description: entry.job.description?.text,
              occupation: entry.job.occupation?.label,
            },
            searchSkills
          ),
        }))
        .sort((left, right) => {
          const relevanceDelta = right.relevance.matched - left.relevance.matched
          if (relevanceDelta !== 0) return relevanceDelta

          const queryCoverageDelta = right.skills.size - left.skills.size
          if (queryCoverageDelta !== 0) return queryCoverageDelta

          return sortByDateDesc(left.job.publication_date, right.job.publication_date)
        })
        .slice(0, MAX_PREVIEW_JOBS)

      const matchCounts = Object.fromEntries(
        sortedJobs.map((entry) => [entry.job.id, entry.relevance.matched])
      )

      setJobs(sortedJobs.map((entry) => entry.job))
      setSkillMatches(matchCounts)
    } catch {
      setJobs([])
      setSkillMatches({})
      setError(t('noResults'))
    } finally {
      setLoading(false)
    }
  }, [skills, t])

  useEffect(() => {
    if (skills.length > 0) {
      void searchJobs()
    } else {
      setLoading(false)
    }
  }, [skills, searchJobs])

  const handleToggleSave = useCallback(async (jobId: string) => {
    const wasSaved = savedJobs.has(jobId)

    // Optimistic update
    setSavedJobs((prev) => {
      const next = new Set(prev)
      if (wasSaved) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })

    try {
      if (wasSaved) {
        const response = await fetch(`/api/jobs/save/${jobId}`, { method: 'DELETE' })
        if (!response.ok) throw new Error()
      } else {
        const response = await fetch('/api/jobs/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ afJobId: jobId }),
        })
        if (!response.ok) throw new Error()
      }
    } catch {
      // Revert on failure
      setSavedJobs((prev) => {
        const next = new Set(prev)
        if (wasSaved) {
          next.add(jobId)
        } else {
          next.delete(jobId)
        }
        return next
      })
    }
  }, [savedJobs])

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
      {error && jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-5 w-5 text-stone-400" />
          <p className="text-[13px] text-stone-500">
            {error}
          </p>
        </div>
      ) : (
        <>
          {/* Location filter */}
          {availableRegions.length > 1 && (
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="">{t('allLocations')}</option>
              {availableRegions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          )}

          {/* Job cards */}
          <div className="w-full space-y-2">
            {filteredJobs.map((job) => (
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
                  <div className="mt-1.5 flex items-center gap-2">
                    {job.occupation?.label && (
                      <span className="inline-block rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                        {job.occupation.label}
                      </span>
                    )}
                    {(skillMatches[job.id] ?? 0) > 0 && (
                      <span className="inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        {t('skillMatch', { count: skillMatches[job.id] })}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => void handleToggleSave(job.id)}
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

          {/* See more link */}
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-600 hover:text-amber-500 transition-colors"
          >
            {t('seeMore')}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </>
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

async function fetchBySkill(skill: string): Promise<AFJobHit[]> {
  const res = await fetch(`/api/jobs?q=${encodeURIComponent(skill)}&limit=10`)
  const json: unknown = await res.json()

  if (
    !json ||
    typeof json !== 'object' ||
    !('success' in json) ||
    !(json as { success: boolean }).success
  ) {
    return []
  }

  const data = (json as { data?: unknown }).data
  if (!data || typeof data !== 'object') return []
  const hits = (data as { hits?: unknown }).hits
  if (!Array.isArray(hits)) return []
  return hits as AFJobHit[]
}
