'use client'

import { useCallback } from 'react'
import type { JobsSearchStateController } from '@/components/jobs/search/types'

export function useSkillSelectionActions(controller: JobsSearchStateController) {
  const { skills, setSelectedSkills } = controller

  const toggleSkill = useCallback(
    (skill: string) => {
      setSelectedSkills((current) =>
        current.includes(skill)
          ? current.filter((item) => item !== skill)
          : [...current, skill]
      )
    },
    [setSelectedSkills]
  )

  const handleSelectAllSkills = useCallback(() => {
    setSelectedSkills(skills)
  }, [setSelectedSkills, skills])

  const handleClearSkills = useCallback(() => {
    setSelectedSkills([])
  }, [setSelectedSkills])

  const handleSelectTopSkills = useCallback(() => {
    setSelectedSkills(skills.slice(0, 5))
  }, [setSelectedSkills, skills])

  return {
    toggleSkill,
    handleSelectAllSkills,
    handleClearSkills,
    handleSelectTopSkills,
  }
}
