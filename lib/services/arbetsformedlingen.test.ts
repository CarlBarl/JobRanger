import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJobById, searchJobs } from './arbetsformedlingen'

describe('arbetsformedlingen client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.AF_API_KEY
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

  it('searchJobs works without api-key header when env is missing', async () => {
    delete process.env.AF_API_KEY

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ total: { value: 0 }, hits: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const res = await searchJobs({ query: 'developer' })

    expect(res).toEqual({ total: { value: 0 }, hits: [] })
    const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers).toMatchObject({ accept: 'application/json' })
    expect(headers).not.toHaveProperty('api-key')
  })

  it('throws on non-2xx responses', async () => {
    process.env.AF_API_KEY = 'af-key'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 500 })
    )

    await expect(searchJobs({ query: 'x' })).rejects.toThrow(/AF API error/i)
  })

  it('does not duplicate region when query already contains it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ total: { value: 0 }, hits: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await searchJobs({ query: 'Frontend Stockholm', region: 'stockholm' })

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://jobsearch.api.jobtechdev.se/search?q=Frontend+Stockholm&limit=20&offset=0',
      expect.any(Object)
    )
  })
})
