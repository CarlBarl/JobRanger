const TOOLTIP_MARGIN = 12
const SPOTLIGHT_PAD = 6
const SPOTLIGHT_EDGE = 2

export type TooltipPosition = {
  left: number
  top: number
}

export type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

export function formatStepLabel(template: string, current: number, total: number): string {
  return template
    .replace('{current}', String(current))
    .replace('{total}', String(total))
}

export function isOffScreen(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return (
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function computeTooltipPosition(
  tooltip: HTMLDivElement,
  targetRect: DOMRect | null
): TooltipPosition {
  const width = tooltip.offsetWidth
  const height = tooltip.offsetHeight

  if (!targetRect) {
    return {
      left: Math.max(TOOLTIP_MARGIN, (window.innerWidth - width) / 2),
      top: Math.max(TOOLTIP_MARGIN, window.innerHeight - height - 24),
    }
  }

  const maxLeft = Math.max(TOOLTIP_MARGIN, window.innerWidth - width - TOOLTIP_MARGIN)
  const left = clamp(
    targetRect.left + targetRect.width / 2 - width / 2,
    TOOLTIP_MARGIN,
    maxLeft
  )

  let top = targetRect.bottom + TOOLTIP_MARGIN
  if (top + height > window.innerHeight - TOOLTIP_MARGIN) {
    top = Math.max(TOOLTIP_MARGIN, targetRect.top - height - TOOLTIP_MARGIN)
  }

  return { left, top }
}

export function computeSpotlightRect(targetRect: DOMRect | null): SpotlightRect | null {
  if (!targetRect) return null

  const rawTop = targetRect.top - SPOTLIGHT_PAD
  const rawLeft = targetRect.left - SPOTLIGHT_PAD
  const top = Math.max(SPOTLIGHT_EDGE, rawTop)
  const left = Math.max(SPOTLIGHT_EDGE, rawLeft)

  return {
    top,
    left,
    width: Math.min(
      targetRect.width + SPOTLIGHT_PAD * 2,
      window.innerWidth - SPOTLIGHT_EDGE * 2
    ),
    height: targetRect.bottom + SPOTLIGHT_PAD - top,
  }
}
