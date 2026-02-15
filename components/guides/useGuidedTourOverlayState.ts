'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeSpotlightRect, computeTooltipPosition, formatStepLabel, isOffScreen } from './guided-tour-utils'
import type { GuidedTourLabels, GuidedTourStep } from './types'

type UseGuidedTourOverlayStateArgs = {
  open: boolean
  steps: GuidedTourStep[]
  labels: GuidedTourLabels
  onClose: (completed: boolean) => void
}

export function useGuidedTourOverlayState({
  open,
  steps,
  labels,
  onClose,
}: UseGuidedTourOverlayStateArgs) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 })
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const liveRegionRef = useRef<HTMLDivElement | null>(null)
  const activeStep = steps[stepIndex] ?? null

  const goNext = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      onClose(true)
      return
    }
    setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))
  }, [onClose, stepIndex, steps.length])

  const goPrev = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1))
  }, [])

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
  }, [open])

  useEffect(() => {
    if (!open || !activeStep) {
      setTargetRect(null)
      return
    }

    const measure = () => {
      const target = document.querySelector<HTMLElement>(`[data-guide-id="${activeStep.targetId}"]`)
      if (!target) {
        setTargetRect(null)
        return
      }

      if (isOffScreen(target)) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTargetRect(target.getBoundingClientRect())
          })
        })
      } else {
        setTargetRect(target.getBoundingClientRect())
      }
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [activeStep, open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(false)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [goNext, goPrev, onClose, open])

  useEffect(() => {
    if (!open) return
    const tooltip = tooltipRef.current
    if (!tooltip) return
    requestAnimationFrame(() => {
      tooltip.focus({ preventScroll: true })
    })
  }, [open, stepIndex])

  useEffect(() => {
    if (!open) return
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusable = tooltip.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === first || document.activeElement === tooltip) {
          event.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleTab)
    return () => {
      window.removeEventListener('keydown', handleTab)
    }
  }, [open, stepIndex])

  useEffect(() => {
    if (!open || !activeStep || !liveRegionRef.current) return
    liveRegionRef.current.textContent = `${formatStepLabel(labels.step, stepIndex + 1, steps.length)}: ${activeStep.title}`
  }, [activeStep, labels.step, open, stepIndex, steps.length])

  useEffect(() => {
    if (!open) return
    const tooltip = tooltipRef.current
    if (!tooltip) return
    setTooltipPosition(computeTooltipPosition(tooltip, targetRect))
  }, [open, stepIndex, targetRect])

  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex >= steps.length - 1
  const stepLabel = formatStepLabel(labels.step, stepIndex + 1, steps.length)
  const progressPercent = ((stepIndex + 1) / steps.length) * 100

  const spotlightRect = useMemo(
    () => computeSpotlightRect(targetRect),
    [targetRect]
  )

  return {
    activeStep,
    goNext,
    goPrev,
    isFirstStep,
    isLastStep,
    liveRegionRef,
    progressPercent,
    spotlightRect,
    stepIndex,
    stepLabel,
    tooltipPosition,
    tooltipRef,
  }
}
