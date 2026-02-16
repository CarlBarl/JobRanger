'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GuidedTourTooltip } from './GuidedTourTooltip'
import { useGuidedTourOverlayState } from './useGuidedTourOverlayState'
import type { GuidedTourLabels, GuidedTourStep } from './types'

interface GuidedTourOverlayProps {
  open: boolean
  steps: GuidedTourStep[]
  labels: GuidedTourLabels
  onClose: (completed: boolean) => void
}

export function GuidedTourOverlay({ open, steps, labels, onClose }: GuidedTourOverlayProps) {
  const hintTimeoutRef = useRef<number | null>(null)
  const [showOutsideClickHint, setShowOutsideClickHint] = useState(false)

  const showBlockedInteractionHint = useCallback(() => {
    setShowOutsideClickHint(true)
    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current)
    }

    hintTimeoutRef.current = window.setTimeout(() => {
      setShowOutsideClickHint(false)
      hintTimeoutRef.current = null
    }, 1600)
  }, [])

  useEffect(() => {
    if (!open) return
    setShowOutsideClickHint(false)
    return () => {
      if (hintTimeoutRef.current) {
        window.clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
    }
  }, [open])

  const {
    activeStep,
    canGoNext,
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
  } = useGuidedTourOverlayState({
    open,
    steps,
    labels,
    onClose,
  })

  useEffect(() => {
    if (!open) return

    const blockOutsideTooltip = (event: Event) => {
      const tooltip = tooltipRef.current
      const target = event.target as Node | null

      if (!tooltip || !target) return
      if (tooltip.contains(target)) return

      if (activeStep?.allowTargetInteraction) {
        const allowedTarget = document.querySelector<HTMLElement>(`[data-guide-id="${activeStep.targetId}"]`)
        if (allowedTarget?.contains(target)) return
      }

      showBlockedInteractionHint()

      if (event.cancelable) {
        event.preventDefault()
      }

      event.stopPropagation()
      ;(event as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.()
    }

    document.addEventListener('pointerdown', blockOutsideTooltip, true)
    document.addEventListener('click', blockOutsideTooltip, true)

    return () => {
      document.removeEventListener('pointerdown', blockOutsideTooltip, true)
      document.removeEventListener('click', blockOutsideTooltip, true)
    }
  }, [activeStep?.allowTargetInteraction, activeStep?.targetId, open, showBlockedInteractionHint, tooltipRef])

  if (!open || !activeStep) return null

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div
        data-testid="guided-tour-backdrop"
        className={
          spotlightRect
            ? 'absolute inset-0'
            : 'absolute inset-0 bg-slate-950/55 animate-fade-in'
        }
      />

      {spotlightRect ? (
        <div
          className="pointer-events-none fixed rounded-xl border-2 border-amber-300 guide-spotlight"
          aria-hidden="true"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      ) : null}

      <div ref={liveRegionRef} className="sr-only" aria-live="polite" />

      <GuidedTourTooltip
        activeStep={activeStep}
        canGoNext={canGoNext}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        labels={labels}
        outsideClickHint={labels.outsideClickHint}
        showOutsideClickHint={showOutsideClickHint}
        onClose={onClose}
        onNext={goNext}
        onPrev={goPrev}
        progressPercent={progressPercent}
        stepIndex={stepIndex}
        stepLabel={stepLabel}
        tooltipPosition={tooltipPosition}
        tooltipRef={tooltipRef}
      />
    </div>
  )
}

export type { GuidedTourLabels, GuidedTourStep } from './types'
