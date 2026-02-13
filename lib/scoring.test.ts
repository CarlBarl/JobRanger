import { describe, it, expect } from 'vitest'
import { extractJobSkills, scoreJobRelevance } from './scoring'

describe('scoreJobRelevance', () => {
  it('returns 0 when no skills match', () => {
    const result = scoreJobRelevance(
      { headline: 'Truck Driver', description: 'Drive trucks across Sweden', occupation: 'Driver' },
      ['JavaScript', 'React']
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(2)
    expect(result.score).toBe(0)
    expect(result.matchedSkills).toEqual([])
  })

  it('counts matching skills case-insensitively', () => {
    const result = scoreJobRelevance(
      { headline: 'Web Developer', description: 'We need javascript and react skills', occupation: 'Developer' },
      ['JavaScript', 'React', 'Python']
    )
    expect(result.matched).toBe(2)
    expect(result.total).toBe(3)
    expect(result.score).toBeCloseTo(2 / 3)
    expect(result.matchedSkills).toEqual(['JavaScript', 'React'])
  })

  it('matches skills in headline and occupation', () => {
    const result = scoreJobRelevance(
      { headline: 'React Developer', description: 'Build apps', occupation: 'JavaScript Developer' },
      ['React', 'JavaScript']
    )
    expect(result.matched).toBe(2)
    expect(result.total).toBe(2)
    expect(result.score).toBe(1)
    expect(result.matchedSkills).toEqual(['React', 'JavaScript'])
  })

  it('returns 0 for empty skills array', () => {
    const result = scoreJobRelevance(
      { headline: 'Developer', description: 'Build stuff', occupation: 'Dev' },
      []
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(0)
    expect(result.score).toBe(0)
    expect(result.matchedSkills).toEqual([])
  })

  it('handles null/undefined fields gracefully', () => {
    const result = scoreJobRelevance(
      { headline: undefined, description: null, occupation: null },
      ['JavaScript']
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(1)
    expect(result.score).toBe(0)
    expect(result.matchedSkills).toEqual([])
  })

  it('does not count partial token matches like go in google', () => {
    const result = scoreJobRelevance(
      { headline: 'Google Cloud Engineer', description: 'Experience with Golang preferred', occupation: 'Engineer' },
      ['Go']
    )

    expect(result.matched).toBe(0)
    expect(result.matchedSkills).toEqual([])
  })

  it('matches punctuated skill variants like Node.js', () => {
    const result = scoreJobRelevance(
      { headline: 'Backend Developer', description: 'Strong node js and TypeScript skills', occupation: 'Developer' },
      ['Node.js', 'TypeScript']
    )

    expect(result.matched).toBe(2)
    expect(result.matchedSkills).toEqual(['Node.js', 'TypeScript'])
  })
})

describe('extractJobSkills', () => {
  it('extracts skills from job text using default catalog', () => {
    const skills = extractJobSkills({
      headline: 'Backend Developer',
      description: 'Build services with Node.js, Docker and PostgreSQL',
      occupation: 'Developer',
    })

    expect(skills).toEqual(
      expect.arrayContaining(['Node.js', 'Docker', 'PostgreSQL'])
    )
  })

  it('does not rely on user-specific skills when extracting job skills', () => {
    const skills = extractJobSkills({
      headline: 'Frontend role',
      description: 'Experience with React and CSS required',
      occupation: 'Engineer',
    })

    expect(skills).toEqual(expect.arrayContaining(['React', 'CSS']))
    expect(skills).not.toContain('Playwright')
  })

  it('uses custom catalog when provided', () => {
    const customCatalog = ['Svetsning', 'Projektledning']
    const skills = extractJobSkills(
      {
        headline: 'Svetsare',
        description: 'Vi soker en erfaren med svetsning och projektledning',
        occupation: 'Svetsare',
      },
      customCatalog
    )

    expect(skills).toEqual(expect.arrayContaining(['Svetsning', 'Projektledning']))
    expect(skills).not.toContain('JavaScript')
  })

  it('falls back to default catalog when no catalog provided', () => {
    const skills = extractJobSkills({
      headline: 'Backend Developer',
      description: 'Build services with Node.js and Docker',
      occupation: 'Developer',
    })

    expect(skills).toEqual(expect.arrayContaining(['Node.js', 'Docker']))
  })
})
