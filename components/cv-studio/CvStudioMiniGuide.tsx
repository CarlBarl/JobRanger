'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { GuidedTourOverlay } from '@/components/guides/GuidedTourOverlay'
import { readGuideFlowState } from '@/lib/guides/flow'

const CV_STUDIO_GUIDE_STORAGE_KEY = 'jobranger:cv-studio-mini-guide-completed'

export function CvStudioMiniGuide() {
  const t = useTranslations('cvStudio.guide')
  const [open, setOpen] = useState(false)

  const steps = useMemo(
    () => [
      {
        id: 'cv-studio-current-cv',
        targetId: 'cv-studio-current-cv',
        title: t('steps.currentCv.title'),
        description: t('steps.currentCv.description'),
      },
      {
        id: 'cv-studio-targets',
        targetId: 'cv-studio-targets',
        title: t('steps.targets.title'),
        description: t('steps.targets.description'),
      },
      {
        id: 'cv-studio-feedback',
        targetId: 'cv-studio-generate-feedback',
        title: t('steps.feedback.title'),
        description: t('steps.feedback.description'),
      },
    ],
    [t]
  )

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return

    const mainGuide = readGuideFlowState()
    if (mainGuide?.active) return

    try {
      if (localStorage.getItem(CV_STUDIO_GUIDE_STORAGE_KEY) === '1') return
    } catch {
      // Ignore storage failures
    }

    setOpen(true)
  }, [])

  const handleClose = useCallback((_completed: boolean) => {
    setOpen(false)
    try {
      localStorage.setItem(CV_STUDIO_GUIDE_STORAGE_KEY, '1')
    } catch {
      // Ignore storage failures
    }
  }, [])

  if (!open) return null

  return (
    <GuidedTourOverlay
      open={open}
      steps={steps}
      labels={{
        step: t('controls.step', { current: '{current}', total: '{total}' }),
        previous: t('controls.previous'),
        next: t('controls.next'),
        finish: t('controls.finish'),
        skip: t('controls.skip'),
        outsideClickHint: t('controls.outsideClickHint'),
        nextLockedHint: t('controls.nextLockedHint'),
      }}
      onClose={handleClose}
    />
  )
}
