'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JobCard } from '@/components/jobs/JobCard'
import { scoreJobRelevance } from '@/lib/scoring'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

type ApiError = { code?: string; message?: string }
type ApiEnvelope = { success: boolean; data?: unknown; error?: ApiError }
type DocumentRecord = {
  type?: string | null
  skills?: unknown
}

type ScoredJob = AFJobHit & { relevance?: { matched: number; total: number; score: number } }

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  )
}

function getHits(data: unknown): AFJobHit[] {
  if (!data || typeof data !== 'object') return []
  const hits = (data as { hits?: unknown }).hits
  if (!Array.isArray(hits)) return []
  return hits as AFJobHit[]
}

export function JobSearch() {
  const t = useTranslations('jobs')
  const [query, setQuery] = useState('')
  const [jobs, setJobs] = useState<AFJobHit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [relevanceEnabled, setRelevanceEnabled] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('')

  const skillQuery = useMemo(
    () => selectedSkills.filter(Boolean).join(' ').trim(),
    [selectedSkills]
  )

  const allSkillsQuery = useMemo(() => skills.filter(Boolean).join(' ').trim(), [skills])

  const availableRegions = useMemo(() => {
    const regions = jobs
      .map((job) => job.workplace_address?.region)
      .filter((r): r is string => !!r && r.trim().length > 0)
    return Array.from(new Set(regions)).sort()
  }, [jobs])

  useEffect(() => {
    let active = true

    const loadSkills = async () => {
      setSkillsLoading(true)
      setSkillsError(null)

      try {
        const res = await fetch('/api/documents')
        const json: unknown = await res.json()

        if (!isApiEnvelope(json)) {
          if (active) {
            setSkills([])
            setSelectedSkills([])
            setSkillsError(t('skillsErrorUnexpected'))
          }
          return
        }

        if (!json.success) {
          if (active) {
            setSkills([])
            setSelectedSkills([])
            setSkillsError(json.error?.message ?? t('skillsErrorFailed'))
          }
          return
        }

        const docs = Array.isArray(json.data) ? (json.data as DocumentRecord[]) : []
        const cvDocWithSkills = docs.find(
          (doc) => doc.type === 'cv' && Array.isArray(doc.skills)
        )
        const rawSkills = Array.isArray(cvDocWithSkills?.skills)
          ? (cvDocWithSkills?.skills as unknown[])
          : []
        const normalizedSkills = Array.from(
          new Set(
            rawSkills
              .filter((skill): skill is string => typeof skill === 'string')
              .map((skill) => skill.trim())
              .filter(Boolean)
          )
        )

        if (active) {
          setSkills(normalizedSkills)
          setSelectedSkills(normalizedSkills)
        }
      } catch {
        if (active) {
          setSkills([])
          setSelectedSkills([])
          setSkillsError(t('skillsErrorFailed'))
        }
      } finally {
        if (active) {
          setSkillsLoading(false)
        }
      }
    }

    void loadSkills()

    return () => {
      active = false
    }
  }, [t])

  useEffect(() => {
    const loadSavedJobs = async () => {
      try {
        const res = await fetch('/api/jobs/save')
        const json: unknown = await res.json()
        if (isApiEnvelope(json) && json.success && Array.isArray(json.data)) {
          const ids = new Set(
            (json.data as Array<{ afJobId: string }>).map((j) => j.afJobId)
          )
          setSavedJobIds(ids)
        }
      } catch {
        // Silent fail — save buttons just won't show pre-saved state
      }
    }
    void loadSavedJobs()
  }, [])

  const handleToggleSave = useCallback(async (afJobId: string) => {
    const wasSaved = savedJobIds.has(afJobId)

    // Optimistic update
    setSavedJobIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) {
        next.delete(afJobId)
      } else {
        next.add(afJobId)
      }
      return next
    })

    try {
      if (wasSaved) {
        const response = await fetch(`/api/jobs/save/${afJobId}`, { method: 'DELETE' })
        if (!response.ok) {
          throw new Error('Failed to remove saved job')
        }
      } else {
        const response = await fetch('/api/jobs/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ afJobId }),
        })
        if (!response.ok) {
          throw new Error('Failed to save job')
        }
      }
    } catch {
      // Revert optimistic update on failure
      setSavedJobIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) {
          next.add(afJobId)
        } else {
          next.delete(afJobId)
        }
        return next
      })
      setError(t('actions.failedToSave'))
    }
  }, [savedJobIds, t])

  const runSearch = useCallback(
    async (overrideQuery?: string) => {
      const q = (overrideQuery ?? query).trim()
      if (!q) {
        setError(t('errorNoSearchTerm'))
        return
      }

      setLoading(true)
      setError(null)
      setSelectedRegion('')

      try {
        const res = await fetch(`/api/jobs?q=${encodeURIComponent(q)}`)
        const json: unknown = await res.json()

        if (!isApiEnvelope(json)) {
          setJobs([])
          setError(t('errorUnexpectedResponse'))
          return
        }

        if (!json.success) {
          setJobs([])
          setError(json.error?.message ?? t('errorSearchFailed'))
          return
        }

        setJobs(getHits(json.data))
      } catch {
        setJobs([])
        setError(t('errorSearchFailed'))
      } finally {
        setLoading(false)
      }
    },
    [query, t]
  )

  const handleSearch = useCallback(() => {
    void runSearch()
  }, [runSearch])

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill]
    )
  }, [])

  const handleSkillSearch = useCallback(() => {
    if (!skillQuery) {
      setError(t('errorSelectSkill'))
      return
    }
    setQuery(skillQuery)
    void runSearch(skillQuery)
  }, [runSearch, skillQuery, t])

  const handleAllSkillsSearch = useCallback(() => {
    if (!allSkillsQuery) {
      setError(t('errorNoSkills'))
      return
    }
    setQuery(allSkillsQuery)
    void runSearch(allSkillsQuery)
  }, [allSkillsQuery, runSearch, t])

  const scoredJobs: ScoredJob[] = useMemo(() => {
    let filtered = jobs

    // Apply region filter
    if (selectedRegion) {
      filtered = filtered.filter(
        (job) => job.workplace_address?.region === selectedRegion
      )
    }

    // Apply relevance scoring
    if (!relevanceEnabled || skills.length === 0) return filtered

    return [...filtered]
      .map((job) => ({
        ...job,
        relevance: scoreJobRelevance(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          skills
        ),
      }))
      .sort((a, b) => (b.relevance?.score ?? 0) - (a.relevance?.score ?? 0))
  }, [jobs, skills, relevanceEnabled, selectedRegion])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">{t('searchWithSkillsTitle')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('searchWithSkillsDescription')}
          </p>
        </div>

        {skillsLoading ? (
          <p className="text-xs text-muted-foreground">{t('loadingSkills')}</p>
        ) : null}

        {skillsError ? (
          <p className="text-sm text-destructive">{skillsError}</p>
        ) : null}

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <label
                key={skill}
                className="flex items-center gap-2 text-sm border rounded-md px-2 py-1"
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill)}
                  onChange={() => toggleSkill(skill)}
                  disabled={loading}
                />
                <span>{skill}</span>
              </label>
            ))}
          </div>
        ) : skillsLoading ? null : (
          <p className="text-xs text-muted-foreground">
            {t('noSkillsFound')}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={handleSkillSearch}
            disabled={loading || skills.length === 0}
          >
            {t('searchWithSelectedSkills')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAllSkillsSearch}
            disabled={loading || skills.length === 0}
          >
            {t('searchWithAllSkills')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="jobs-q">{t('search')}</Label>
          <Input
            id="jobs-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            disabled={loading}
          />
        </div>
        <Button type="button" onClick={handleSearch} disabled={loading}>
          {loading ? t('searching') : t('search')}
        </Button>
      </div>

      {skills.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={relevanceEnabled}
              onChange={(e) => setRelevanceEnabled(e.target.checked)}
              className="rounded"
            />
            <span>{t('relevanceToggle')}</span>
          </label>
        </div>
      )}

      {availableRegions.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="region-filter" className="text-sm font-medium">
            {t('regionFilter')}:
          </label>
          <select
            id="region-filter"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
          >
            <option value="">{t('allRegions')}</option>
            {availableRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {scoredJobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {scoredJobs.map((job) => (
            <div key={job.id} className="relative">
              {job.relevance && job.relevance.matched > 0 && (
                <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t('relevanceBadge', {
                    matched: job.relevance.matched,
                    total: job.relevance.total,
                  })}
                </span>
              )}
              <JobCard
                job={job}
                isSaved={savedJobIds.has(job.id)}
                onToggleSave={handleToggleSave}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
