import { describe, expect, it } from 'vitest'
import { buildCatalogIndex, mapSkillToCatalog, mapSkillsToCatalog } from './catalog-map'

describe('skill catalog mapping', () => {
  it('maps exact catalog matches', () => {
    const index = buildCatalogIndex(['TypeScript'])
    expect(mapSkillToCatalog('TypeScript', index)).toBe('TypeScript')
  })

  it('maps punctuation/spacing variants by normalized key', () => {
    const index = buildCatalogIndex(['Node.js'])
    expect(mapSkillToCatalog('Node js', index)).toBe('Node.js')
    expect(mapSkillToCatalog('nodejs', index)).toBe('Node.js')
  })

  it('maps common aliases like React.js → React', () => {
    const index = buildCatalogIndex(['React'])
    expect(mapSkillToCatalog('React.js', index)).toBe('React')
    expect(mapSkillToCatalog('reactjs', index)).toBe('React')
  })

  it('returns null when no reasonable mapping exists', () => {
    const index = buildCatalogIndex(['React', 'TypeScript'])
    expect(mapSkillToCatalog('Completely Unknown Skill', index)).toBe(null)
  })

  it('caps skills to 25 before mapping', () => {
    const rawSkills = Array.from({ length: 30 }, (_, i) => `Skill${i}`)
    const result = mapSkillsToCatalog(rawSkills, [])
    expect(result.skillsToStore).toHaveLength(25)
    expect(result.skillsToStore[0]).toBe('Skill0')
    expect(result.skillsToStore[24]).toBe('Skill24')
  })

  it('dedupes mapped and unmapped skills by normalized key', () => {
    const result = mapSkillsToCatalog(['React.js', 'React', ' react  '], ['React'])
    expect(result.skillsToStore).toEqual(['React'])
  })
})

