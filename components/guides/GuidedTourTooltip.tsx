'use client'

import { X } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import type { GuidedTourLabels, GuidedTourStep } from './types'

type GuidedTourTooltipProps = {
  activeStep: GuidedTourStep
  isFirstStep: boolean
  isLastStep: boolean
  labels: GuidedTourLabels
  onClose: (completed: boolean) => void
  onNext: () => void
  onPrev: () => void
  progressPercent: number
  stepIndex: number
  stepLabel: string
  tooltipPosition: {
    left: number
    top: number
  }
  tooltipRef: RefObject<HTMLDivElement>
}

export function GuidedTourTooltip({
  activeStep,
  isFirstStep,
  isLastStep,
  labels,
  onClose,
  onNext,
  onPrev,
  progressPercent,
  stepIndex,
  stepLabel,
  tooltipPosition,
  tooltipRef,
}: GuidedTourTooltipProps) {
  return (
    <div
      key={stepIndex}
      ref={tooltipRef}
      tabIndex={-1}
      className="fixed z-[81] w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-border/80 bg-card p-4 shadow-xl outline-none animate-scale-in"
      style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
      role="dialog"
      aria-modal="true"
      aria-label={stepLabel}
    >
      <div className="mb-3 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${progressPercent}%`,
            transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            {stepLabel}
          </p>
          <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-foreground">
            {activeStep.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onClose(false)}
          className="-mr-1 rounded p-2 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          aria-label={labels.skip}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {activeStep.description}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onClose(false)}
          className="text-[12px]"
        >
          {labels.skip}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={isFirstStep}
            className="text-[12px]"
          >
            {labels.previous}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onNext}
            className="text-[12px]"
          >
            {isLastStep ? labels.finish : labels.next}
          </Button>
        </div>
      </div>
    </div>
  )
}
