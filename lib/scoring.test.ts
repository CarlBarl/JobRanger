import { describe, it, expect } from 'vitest'
import { scoreJobRelevance } from './scoring'

describe('scoreJobRelevance', () => {
  it('returns 0 when no skills match', () => {
    const result = scoreJobRelevance(
      { headline: 'Truck Driver', description: 'Drive trucks across Sweden', occupation: 'Driver' },
      ['JavaScript', 'React']
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(2)
    expect(result.score).toBe(0)
  })

  it('counts matching skills case-insensitively', () => {
    const result = scoreJobRelevance(
      { headline: 'Web Developer', description: 'We need javascript and react skills', occupation: 'Developer' },
      ['JavaScript', 'React', 'Python']
    )
    expect(result.matched).toBe(2)
    expect(result.total).toBe(3)
    expect(result.score).toBeCloseTo(2 / 3)
  })

  it('matches skills in headline and occupation', () => {
    const result = scoreJobRelevance(
      { headline: 'React Developer', description: 'Build apps', occupation: 'JavaScript Developer' },
      ['React', 'JavaScript']
    )
    expect(result.matched).toBe(2)
    expect(result.total).toBe(2)
    expect(result.score).toBe(1)
  })

  it('returns 0 for empty skills array', () => {
    const result = scoreJobRelevance(
      { headline: 'Developer', description: 'Build stuff', occupation: 'Dev' },
      []
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(0)
    expect(result.score).toBe(0)
  })

  it('handles null/undefined fields gracefully', () => {
    const result = scoreJobRelevance(
      { headline: undefined, description: null, occupation: null },
      ['JavaScript']
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(1)
    expect(result.score).toBe(0)
  })
})
