import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJobById, searchJobs } from './arbetsformedlingen'

describe('arbetsformedlingen client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searchJobs calls AF /search with api-key header', async () => {
    process.env.AF_API_KEY = 'af-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ total: { value: 0 }, hits: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const res = await searchJobs({ query: 'developer', limit: 10, offset: 5 })

    expect(res).toEqual({ total: { value: 0 }, hits: [] })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://jobsearch.api.jobtechdev.se/search?q=developer&limit=10&offset=5',
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: 'application/json',
          'api-key': 'af-key',
        }),
      })
    )
  })

  it('getJobById calls AF /ad/{id} with api-key header', async () => {
    process.env.AF_API_KEY = 'af-key'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: '123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const res = await getJobById('123')

    expect(res).toEqual({ id: '123' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://jobsearch.api.jobtechdev.se/ad/123',
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: 'application/json',
          'api-key': 'af-key',
        }),
      })
    )
  })

  it('throws on non-2xx responses', async () => {
    process.env.AF_API_KEY = 'af-key'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 500 })
    )

    await expect(searchJobs({ query: 'x' })).rejects.toThrow(/AF API error/i)
  })
})

