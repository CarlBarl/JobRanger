'use client'

import { useEffect } from 'react'
import { fetchJobById, isApiEnvelope } from '@/components/jobs/search/fetchers'
import { reconcileSelectedSkills } from '@/components/jobs/search/normalizers'
import type {
  DocumentRecord,
  JobsSearchStateController,
  JobsTranslations,
  SavedJobRecord,
} from '@/components/jobs/search/types'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

interface UseJobsSearchDataParams {
  t: JobsTranslations
  controller: JobsSearchStateController
}

export function useJobsSearchData({ t, controller }: UseJobsSearchDataParams) {
  const {
    restoredStateRef,
    setSkillsLoading,
    setSkillsError,
    setSkills,
    setSelectedSkills,
    setSavedJobsLoading,
    setSavedJobsError,
    setSavedJobs,
    setSavedJobIds,
    setSkillCatalog,
  } = controller

  useEffect(() => {
    let active = true

    const loadSkills = async () => {
      setSkillsLoading(true)
      setSkillsError(null)

      try {
        const response = await fetch('/api/documents')
        const json: unknown = await response.json()

        if (!isApiEnvelope(json)) {
          if (active && !restoredStateRef.current) {
            setSkills([])
            setSelectedSkills([])
            setSkillsError(t('skillsErrorUnexpected'))
          }
          return
        }

        if (!json.success) {
          if (active && !restoredStateRef.current) {
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
          setSelectedSkills((current) => {
            if (!restoredStateRef.current) return normalizedSkills
            return reconcileSelectedSkills(current, normalizedSkills)
          })
        }
      } catch {
        if (active && !restoredStateRef.current) {
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
  }, [
    restoredStateRef,
    setSelectedSkills,
    setSkills,
    setSkillsError,
    setSkillsLoading,
    t,
  ])

  useEffect(() => {
    let active = true

    const loadSavedJobs = async () => {
      setSavedJobsLoading(true)
      setSavedJobsError(null)

      try {
        const response = await fetch('/api/jobs/save')
        const json: unknown = await response.json()

        if (!isApiEnvelope(json) || !json.success || !Array.isArray(json.data)) {
          if (active) {
            setSavedJobs([])
            setSavedJobIds(new Set())
            setSavedJobsError(t('savedJobsLoadFailed'))
          }
          return
        }

        const orderedIds = (json.data as SavedJobRecord[])
          .map((record) => record.afJobId?.trim() ?? '')
          .filter((id): id is string => id.length > 0)
        const uniqueOrderedIds = Array.from(new Set(orderedIds))

        if (!active) return
        setSavedJobIds(new Set(uniqueOrderedIds))

        if (uniqueOrderedIds.length === 0) {
          setSavedJobs([])
          return
        }

        const settled = await Promise.allSettled(uniqueOrderedIds.map((id) => fetchJobById(id)))
        if (!active) return

        const loadedJobs = settled
          .filter(
            (result): result is PromiseFulfilledResult<AFJobHit | null> =>
              result.status === 'fulfilled'
          )
          .map((result) => result.value)
          .filter((job): job is AFJobHit => !!job)

        setSavedJobs(loadedJobs)
        if (loadedJobs.length !== uniqueOrderedIds.length) {
          setSavedJobsError(t('savedJobsSomeUnavailable'))
        }
      } catch {
        if (active) {
          setSavedJobsError(t('savedJobsLoadFailed'))
          setSavedJobs([])
          setSavedJobIds(new Set())
        }
      } finally {
        if (active) {
          setSavedJobsLoading(false)
        }
      }
    }

    void loadSavedJobs()

    return () => {
      active = false
    }
  }, [
    setSavedJobIds,
    setSavedJobs,
    setSavedJobsError,
    setSavedJobsLoading,
    t,
  ])

  useEffect(() => {
    let active = true

    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/skills/catalog')
        const json: unknown = await response.json()

        if (
          active &&
          json &&
          typeof json === 'object' &&
          'success' in json &&
          (json as { success: boolean }).success &&
          'data' in json &&
          Array.isArray((json as { data: unknown }).data)
        ) {
          setSkillCatalog((json as { data: string[] }).data)
        }
      } catch {
        // Silent failure — extractJobSkills uses default catalog
      }
    }

    void loadCatalog()

    return () => {
      active = false
    }
  }, [setSkillCatalog])
}
