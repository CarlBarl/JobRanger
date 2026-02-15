'use client'

import { useJobsSaveActions } from '@/components/jobs/search/useJobsSaveActions'
import { useJobsSearchExecution } from '@/components/jobs/search/useJobsSearchExecution'
import { useSkillSelectionActions } from '@/components/jobs/search/useSkillSelectionActions'
import type {
  JobsSearchStateController,
  JobsTranslations,
} from '@/components/jobs/search/types'

interface UseJobsSearchActionsParams {
  t: JobsTranslations
  onFirstSearch?: () => void
  controller: JobsSearchStateController
}

export function useJobsSearchActions({
  t,
  onFirstSearch,
  controller,
}: UseJobsSearchActionsParams) {
  const handleToggleSave = useJobsSaveActions({ controller, t })
  const { handleUnifiedSearch } = useJobsSearchExecution({ t, onFirstSearch, controller })
  const {
    toggleSkill,
    handleSelectAllSkills,
    handleClearSkills,
    handleSelectTopSkills,
  } = useSkillSelectionActions(controller)

  return {
    handleToggleSave,
    handleUnifiedSearch,
    toggleSkill,
    handleSelectAllSkills,
    handleClearSkills,
    handleSelectTopSkills,
  }
}
