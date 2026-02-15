import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_JOB_SKILL_CATALOG } from '@/lib/scoring'

const mocks = vi.hoisted(() => ({
  fetchSkillCatalog: vi.fn(),
}))

vi.mock('@/lib/services/jobtech-enrichments', () => ({
  fetchSkillCatalog: mocks.fetchSkillCatalog,
}))

describe('GET /api/skills/catalog', () => {
  let GET: typeof import('./route').GET

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    ;({ GET } = await import('./route'))
  })

  it('returns skills from AF when available', async () => {
    mocks.fetchSkillCatalog.mockResolvedValue(['JavaScript', 'Python', 'React'])

    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(['JavaScript', 'Python', 'React'])
  })

  it('returns fallback catalog when AF fails', async () => {
    mocks.fetchSkillCatalog.mockRejectedValue(new Error('AF down'))

    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(Array.from(DEFAULT_JOB_SKILL_CATALOG))
  })

  it('returns fallback when AF returns empty array', async () => {
    mocks.fetchSkillCatalog.mockResolvedValue([])

    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(Array.from(DEFAULT_JOB_SKILL_CATALOG))
  })

  it('serves cached data on subsequent calls', async () => {
    mocks.fetchSkillCatalog.mockResolvedValue(['Rust', 'Go'])

    await GET()
    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toEqual(['Rust', 'Go'])
    expect(mocks.fetchSkillCatalog).toHaveBeenCalledTimes(1)
  })
})
