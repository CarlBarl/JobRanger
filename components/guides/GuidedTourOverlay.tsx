'use client'

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
  const {
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
  } = useGuidedTourOverlayState({
    open,
    steps,
    labels,
    onClose,
  })

  if (!open || !activeStep) return null

  return (
    <div className="fixed inset-0 z-[80]">
      {!spotlightRect ? (
        <div
          className="absolute inset-0 bg-slate-950/55 animate-fade-in"
          onClick={() => onClose(false)}
        />
      ) : null}

      {spotlightRect ? (
        <div
          className="absolute inset-0"
          onClick={() => onClose(false)}
        />
      ) : null}

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
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        labels={labels}
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
