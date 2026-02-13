import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { JobSearch } from './JobSearch'

function mockFetchWithSkills(skills: string[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.startsWith('/api/documents')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'doc-1',
                type: 'cv',
                skills,
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url.startsWith('/api/jobs/save')) {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }

    if (url.startsWith('/api/jobs')) {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { hits: [] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }

    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}

function mockFetchWithPartialUnavailableSavedJobs() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/documents') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'doc-1',
                type: 'cv',
                skills: [],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url === '/api/jobs/save') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ afJobId: '111' }, { afJobId: '222' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url === '/api/jobs/111') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: '111',
              headline: 'Still Active Role',
              employer: { name: 'Acme AB' },
              workplace_address: { municipality: 'Stockholm' },
              publication_date: '2026-01-01T10:00:00.000Z',
              application_deadline: '2026-03-01T23:59:59.000Z',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url === '/api/jobs/222') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Job not found' },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url.startsWith('/api/jobs')) {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { hits: [] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }

    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}

function mockFetchWithRegionalSearchResults() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/documents') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'doc-1',
                type: 'cv',
                skills: [],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url === '/api/jobs/save') {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }

    if (url.startsWith('/api/jobs')) {
      const params = new URL(url, 'http://localhost').searchParams
      const selectedRegion = params.get('region')
      const hits = selectedRegion
        ? [
            {
              id: '1',
              headline: 'Developer Stockholm',
              workplace_address: { region: 'Stockholm' },
              publication_date: '2026-01-01T10:00:00.000Z',
            },
          ]
        : [
            {
              id: '1',
              headline: 'Developer Stockholm',
              workplace_address: { region: 'Stockholm' },
              publication_date: '2026-01-01T10:00:00.000Z',
            },
            {
              id: '2',
              headline: 'Developer Skane',
              workplace_address: { region: 'Skane' },
              publication_date: '2026-01-02T10:00:00.000Z',
            },
          ]

      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              hits,
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}

function mockFetchWithCountyRegionNaming() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/documents') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: [] }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url === '/api/jobs/save') {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }

    if (url.startsWith('/api/jobs')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              hits: [
                {
                  id: '1',
                  headline: 'Developer Stockholm County',
                  workplace_address: { region: 'Stockholms län' },
                  publication_date: '2026-01-01T10:00:00.000Z',
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}

describe('JobSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders tabs and search button', async () => {
    mockFetchWithSkills(['React'])

    render(<JobSearch />)

    expect(await screen.findByRole('tab', { name: /search results/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /saved/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('searches using selected skills via unified search', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchWithSkills(['React', 'TypeScript', 'Node'])

    render(<JobSearch />)

    // Wait for skills to load, then open skills panel
    const skillsToggle = await screen.findByText(/3\/3 skills selected/i)
    await user.click(skillsToggle)

    // Deselect Node by clicking the chip
    const nodeChip = screen.getByRole('button', { name: 'Node' })
    await user.click(nodeChip)

    // Click unified Search button
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map(([input]) =>
        typeof input === 'string' ? input : input.toString()
      )
      expect(calledUrls).toContain('/api/jobs?q=React&limit=100')
      expect(calledUrls).toContain('/api/jobs?q=TypeScript&limit=100')
      expect(calledUrls.some((u) => u.startsWith('/api/jobs?q=Node'))).toBe(false)
    })
  })

  it('shows selected skill chips as compact summary', async () => {
    mockFetchWithSkills(['React', 'TypeScript', 'Node'])

    render(<JobSearch />)

    // Wait for skills to load - chips should be visible as summary
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('Node')).toBeInTheDocument()
    })
  })

  it('shows "+N more" when many skills are selected', async () => {
    mockFetchWithSkills([
      'React', 'TypeScript', 'Node', 'CSS', 'Docker',
      'Python', 'Go', 'Rust',
    ])

    render(<JobSearch />)

    await waitFor(() => {
      expect(screen.getByText('+3 more')).toBeInTheDocument()
    })
  })

  it('switches to saved jobs tab', async () => {
    const user = userEvent.setup()
    mockFetchWithSkills([])

    render(<JobSearch />)

    const savedTab = await screen.findByRole('tab', { name: /saved/i })
    await user.click(savedTab)

    expect(await screen.findByText(/no saved jobs yet/i)).toBeInTheDocument()
  })

  it('shows available saved jobs even when some saved jobs are unavailable', async () => {
    const user = userEvent.setup()
    mockFetchWithPartialUnavailableSavedJobs()

    render(<JobSearch />)

    const savedTab = await screen.findByRole('tab', { name: /saved/i })
    await user.click(savedTab)

    expect(
      await screen.findByText(/some saved jobs are no longer available/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Still Active Role' })).toBeInTheDocument()
  })

  it('performs text-only search when no skills are selected', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchWithSkills([])

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    await user.type(searchInput, 'developer')

    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map(([input]) =>
        typeof input === 'string' ? input : input.toString()
      )
      expect(calledUrls).toContain('/api/jobs?q=developer&limit=100')
    })
  })

  it('shows error when searching with no query and no skills', async () => {
    const user = userEvent.setup()
    mockFetchWithSkills([])

    render(<JobSearch />)

    await screen.findByPlaceholderText(/search by job title/i)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByText(/please enter a search term or select skills/i)).toBeInTheDocument()
  })

  it('includes selected region in first search fetch', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchWithRegionalSearchResults()

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    const regionInput = screen.getByPlaceholderText(/region \(optional\)/i)

    await user.type(searchInput, 'developer')
    await user.type(regionInput, 'Stockholm')

    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map(([input]) =>
        typeof input === 'string' ? input : input.toString()
      )
      expect(
        calledUrls.some(
          (url) =>
            url.includes('q=developer') &&
            url.includes('limit=100') &&
            url.includes('region=Stockholm')
        )
      ).toBe(true)
    })

    expect(screen.queryByLabelText(/filter by region/i)).not.toBeInTheDocument()
  })

  it('allows region-only search on first search', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchWithRegionalSearchResults()

    render(<JobSearch />)

    const regionInput = await screen.findByPlaceholderText(/region \(optional\)/i)
    await user.type(regionInput, 'Stockholm')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      const calledUrls = fetchMock.mock.calls.map(([input]) =>
        typeof input === 'string' ? input : input.toString()
      )
      expect(
        calledUrls.some(
          (url) =>
            url.includes('q=Stockholm') &&
            url.includes('limit=100') &&
            url.includes('region=Stockholm')
        )
      ).toBe(true)
    })
  })

  it('matches region filter when user input is lowercase and result uses county naming', async () => {
    const user = userEvent.setup()
    mockFetchWithCountyRegionNaming()

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    const regionInput = screen.getByPlaceholderText(/region \(optional\)/i)

    await user.type(searchInput, 'developer')
    await user.type(regionInput, 'stockholm')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(
      await screen.findByRole('link', { name: 'Developer Stockholm County' })
    ).toBeInTheDocument()
  })
})
