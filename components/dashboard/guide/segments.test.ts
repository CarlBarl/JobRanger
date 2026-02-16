import { describe, expect, it } from 'vitest'
import { createSegmentGuides } from '@/components/dashboard/guide/segments'

describe('createSegmentGuides', () => {
  it('does not target removed top-nav ids', () => {
    const t = (key: string) => key
    const guides = createSegmentGuides(t)

    const targets = Object.values(guides)
      .flat()
      .map((step) => step.targetId)

    expect(targets).not.toContain('top-nav-letters')
    expect(targets).not.toContain('top-nav-language')
    expect(targets).not.toContain('top-nav-guide-button')
  })

  it('includes dashboard quick-link targets', () => {
    const t = (key: string) => key
    const guides = createSegmentGuides(t)

    const dashboardTargets = guides.dashboard.map((step) => step.targetId)

    expect(dashboardTargets).toContain('dashboard-quick-actions')
    expect(dashboardTargets).toContain('dashboard-quick-link-cv-studio')
    expect(dashboardTargets).toContain('dashboard-quick-link-letters')
    expect(dashboardTargets).toContain('dashboard-quick-link-settings')
  })
})
