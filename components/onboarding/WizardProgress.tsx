'use client'

import { cn } from '@/lib/utils'

interface WizardProgressProps {
  currentStep: number // 0-indexed, 0-4
  totalSteps?: number // default 5
  className?: string
}

export function WizardProgress({
  currentStep,
  totalSteps = 5,
  className,
}: WizardProgressProps) {
  return (
    <div
      className={cn('flex w-full max-w-[320px] items-center gap-[2px]', className)}
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep

        return (
          <div
            key={i}
            className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-stone-300/60"
          >
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full bg-amber-500 transition-[width] duration-300 ease-out',
                'motion-reduce:transition-none',
              )}
              style={{
                width: isCompleted ? '100%' : isCurrent ? '100%' : '0%',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
