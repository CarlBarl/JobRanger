import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSkillCatalog } from './jobtech-enrichments'

describe('fetchSkillCatalog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns unique skill labels from AF synonym dictionary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total: 3,
          items: [
            { concept_label: 'JavaScript', term: 'javascript', type: 'COMPETENCE' },
            { concept_label: 'Python', term: 'python', type: 'COMPETENCE' },
            { concept_label: 'JavaScript', term: 'js', type: 'COMPETENCE' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const skills = await fetchSkillCatalog()

    expect(skills).toContain('JavaScript')
    expect(skills).toContain('Python')
    expect(skills.filter((s) => s === 'JavaScript')).toHaveLength(1)
  })

  it('throws on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Server Error', { status: 500 })
    )

    await expect(fetchSkillCatalog()).rejects.toThrow()
  })

  it('throws on invalid response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(fetchSkillCatalog()).rejects.toThrow()
  })
})
