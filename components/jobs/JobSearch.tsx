'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JobCard } from '@/components/jobs/JobCard'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

type ApiError = { code?: string; message?: string }
type ApiEnvelope = { success: boolean; data?: unknown; error?: ApiError }
type DocumentRecord = {
  type?: string | null
  skills?: unknown
}

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

  const skillQuery = useMemo(
    () => selectedSkills.filter(Boolean).join(' ').trim(),
    [selectedSkills]
  )

  const allSkillsQuery = useMemo(() => skills.filter(Boolean).join(' ').trim(), [skills])

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

  const runSearch = useCallback(
    async (overrideQuery?: string) => {
      const q = (overrideQuery ?? query).trim()
      if (!q) {
        setError(t('errorNoSearchTerm'))
        return
      }

      setLoading(true)
      setError(null)

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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
