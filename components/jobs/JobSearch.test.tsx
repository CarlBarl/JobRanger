import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@/lib/test-utils'
import { JobSearch } from './JobSearch'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

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

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
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

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
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

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
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

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
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

function mockFetchWithMixedRegionMatches() {
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

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
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
                  headline: 'Stockholm Match Role',
                  workplace_address: { region: 'Stockholms län' },
                  publication_date: '2026-01-01T10:00:00.000Z',
                },
                {
                  id: '2',
                  headline: 'Remote Role',
                  workplace_address: { region: 'Skåne län' },
                  publication_date: '2026-01-02T10:00:00.000Z',
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

function mockFetchWithSkillMatchedJob() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/documents') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: ['Node.js'] }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
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
                  id: '10',
                  headline: 'Backend Developer',
                  occupation: { label: 'Developer' },
                  description: { text: 'Build APIs with node js, docker and postgresql' },
                  workplace_address: { region: 'Stockholm' },
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

function mockFetchWithCatalogAndJob() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/documents') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: ['Svetsning'] }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: ['Svetsning', 'Projektledning', 'CNC'],
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
                  id: '20',
                  headline: 'CNC-operat\u00f6r',
                  occupation: { label: 'Maskinoperat\u00f6r' },
                  description: { text: 'Vi s\u00f6ker CNC-operat\u00f6r med erfarenhet av svetsning och projektledning' },
                  workplace_address: { region: 'G\u00f6teborg' },
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

function mockFetchWithNoSkillJob() {
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

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
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
                  id: '30',
                  headline: 'Truck Driver',
                  description: { text: 'Drive trucks across Sweden' },
                  workplace_address: { region: 'Stockholm' },
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
    sessionStorage.clear()
  })

  it('renders tabs and search button', async () => {
    mockFetchWithSkills(['React'])

    render(<JobSearch />)

    expect(await screen.findByRole('tab', { name: /search results/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /saved/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('restores previous search state from sessionStorage', async () => {
    mockFetchWithSkills(['React', 'TypeScript'])
    sessionStorage.setItem(
      'jobranger:jobsSearchState:v1',
      JSON.stringify({
        v: 1,
        tab: 'search',
        query: 'developer',
        region: 'Stockholm',
        skills: ['React', 'TypeScript'],
        selectedSkills: ['React'],
        skillsPanelOpen: true,
        hasSearched: true,
        jobs: [
          {
            id: 'persisted-job',
            headline: 'Persisted Job',
            publication_date: '2026-01-01T10:00:00.000Z',
            description: { text: 'React TypeScript' },
            workplace_address: { region: 'Stockholm' },
            occupation: { label: 'Developer' },
          },
        ],
        searchSkillMatches: {},
        error: null,
        currentPage: 1,
        itemsPerPage: 20,
      })
    )

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    expect(searchInput).toHaveValue('developer')

    const regionInput = screen.getByPlaceholderText(/region/i)
    expect(regionInput).toHaveValue('Stockholm')

    expect(await screen.findByText(/1\/2 skills selected/i)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /persisted job/i })).toBeInTheDocument()
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

  it('uses single text search when both text query and skills are provided', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchWithSkills(['React', 'TypeScript'])

    render(<JobSearch />)

    await screen.findByText(/2\/2 skills selected/i)

    const searchInput = screen.getByPlaceholderText(/search by job title/i)
    await user.type(searchInput, 'ai automation')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      const jobUrls = fetchMock.mock.calls
        .map(([input]) => (typeof input === 'string' ? input : input.toString()))
        .filter((u) => u.startsWith('/api/jobs?'))

      expect(jobUrls).toHaveLength(1)

      const queryValues = jobUrls
        .map((url) => new URL(url, 'http://localhost').searchParams.get('q'))
        .filter((value): value is string => Boolean(value))

      expect(queryValues).toEqual(['ai automation'])
      expect(queryValues).not.toContain('React ai automation')
      expect(queryValues).not.toContain('TypeScript ai automation')
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
    expect(screen.getByRole('link', { name: /still active role/i })).toBeInTheDocument()
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
      await screen.findByRole('link', { name: /developer stockholm county/i })
    ).toBeInTheDocument()
  })

  it('keeps non-matching region jobs visible when region input is used', async () => {
    const user = userEvent.setup()
    mockFetchWithMixedRegionMatches()

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    const regionInput = screen.getByPlaceholderText(/region \(optional\)/i)

    await user.type(searchInput, 'developer')
    await user.type(regionInput, 'stockholm')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /stockholm match role/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /remote role/i })).toBeInTheDocument()
  })

  it('shows all extracted job skills when expanded, including unmatched ones', async () => {
    const user = userEvent.setup()
    mockFetchWithSkillMatchedJob()

    render(<JobSearch />)

    await screen.findByText(/1\/1 skills selected/i)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /backend developer/i })).toBeInTheDocument()
    expect(await screen.findByText(/1 matched skills/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show job skills/i }))

    const skillContainer = await screen.findByTestId('job-skills-10')
    expect(within(skillContainer).getByText('Node.js')).toBeInTheDocument()
    expect(within(skillContainer).getByText('Docker')).toBeInTheDocument()
    expect(within(skillContainer).getByText('PostgreSQL')).toBeInTheDocument()
  })

  it('highlights matched skills differently from unmatched skills', async () => {
    const user = userEvent.setup()
    mockFetchWithSkillMatchedJob()

    render(<JobSearch />)

    await screen.findByText(/1\/1 skills selected/i)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /backend developer/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show job skills/i }))

    const skillContainer = await screen.findByTestId('job-skills-10')
    const nodeChip = within(skillContainer).getByText('Node.js')
    const dockerChip = within(skillContainer).getByText('Docker')

    // Node.js is a CV skill → matched → primary styling
    expect(nodeChip.className).toContain('bg-primary/10')
    expect(nodeChip.className).toContain('text-primary')

    // Docker is NOT a CV skill → unmatched → secondary styling
    expect(dockerChip.className).toContain('bg-secondary/80')
    expect(dockerChip.className).toContain('text-muted-foreground')
  })

  it('uses fetched catalog for job skill extraction', async () => {
    const user = userEvent.setup()
    mockFetchWithCatalogAndJob()

    render(<JobSearch />)

    await screen.findByText(/1\/1 skills selected/i)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /cnc-operat\u00f6r/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show job skills/i }))

    const skillContainer = await screen.findByTestId('job-skills-20')
    expect(within(skillContainer).getByText('Svetsning')).toBeInTheDocument()
    expect(within(skillContainer).getByText('Projektledning')).toBeInTheDocument()
    expect(within(skillContainer).getByText('CNC')).toBeInTheDocument()
  })

  it('shows empty state message when job has no extracted skills', async () => {
    const user = userEvent.setup()
    mockFetchWithNoSkillJob()

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    await user.type(searchInput, 'truck driver')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /truck driver/i })).toBeInTheDocument()

    // Button should be visible even with no skills
    const showButton = screen.getByRole('button', { name: /show job skills/i })
    expect(showButton).toBeInTheDocument()

    await user.click(showButton)

    expect(screen.getByText(/no skills found for this job/i)).toBeInTheDocument()
  })

  it('streams results with pagination locked until all skill queries complete', async () => {
    const user = userEvent.setup()
    let resolveNode: ((value: Response | PromiseLike<Response>) => void) | null = null

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/documents') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: ['React', 'Node'] }],
          })
        )
      }

      if (url.startsWith('/api/skills/catalog')) {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url === '/api/jobs/save') {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url.startsWith('/api/jobs?')) {
        const query = new URL(url, 'http://localhost').searchParams.get('q') ?? ''
        if (query === 'React') {
        const hits = Array.from({ length: 21 }, (_, idx) => ({
          id: `react-${idx + 1}`,
          headline: `React Role ${idx + 1}`,
          publication_date: `2026-01-${String((idx % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
          description: { text: 'React TypeScript' },
          occupation: { label: 'Developer' },
          workplace_address: { region: 'Stockholm' },
        }))
        return Promise.resolve(jsonResponse({ success: true, data: { hits } }))
        }
        if (query === 'Node') {
          return new Promise<Response>((resolve) => {
            resolveNode = resolve
          })
        }
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<JobSearch />)

    await screen.findByText(/2\/2 skills selected/i)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByText(/found 21 jobs so far \(1 searches left\)\.\.\./i)).toBeInTheDocument()
    expect((await screen.findAllByRole('link', { name: /React Role/i })).length).toBeGreaterThan(0)

    const pagination = await screen.findByTestId('search-results-pagination')
    expect(pagination).toHaveAttribute('data-locked', 'true')
    expect(within(pagination).getByText('2')).toHaveAttribute('aria-disabled', 'true')

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- set by mock
    resolveNode!(
      jsonResponse({
        success: true,
        data: {
          hits: [
            {
              id: 'node-1',
              headline: 'Node Role 1',
              publication_date: '2026-01-30T10:00:00.000Z',
              description: { text: 'Node backend' },
              occupation: { label: 'Developer' },
              workplace_address: { region: 'Stockholm' },
            },
          ],
        },
      })
    )

    expect(await screen.findByText(/found 22 jobs matching your search/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('search-results-pagination')).toHaveAttribute('data-locked', 'false')
    })
  })

  it('updates skill-match sorting when selected skills change after a skill search', async () => {
    const user = userEvent.setup()

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/documents') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: ['React', 'Node'] }],
          })
        )
      }

      if (url.startsWith('/api/skills/catalog')) {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url === '/api/jobs/save') {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url.startsWith('/api/jobs?')) {
        const query = new URL(url, 'http://localhost').searchParams.get('q') ?? ''

        const jobA = {
          id: 'job-a',
          headline: 'Fullstack React Node',
          publication_date: '2026-01-01T10:00:00.000Z',
          description: { text: 'React Node' },
          occupation: { label: 'Developer' },
          workplace_address: { region: 'Stockholm' },
        }

        const jobB = {
          id: 'job-b',
          headline: 'React Only Role',
          publication_date: '2026-01-30T10:00:00.000Z',
          description: { text: 'React' },
          occupation: { label: 'Developer' },
          workplace_address: { region: 'Stockholm' },
        }

        if (query === 'React') {
          return Promise.resolve(
            jsonResponse({ success: true, data: { hits: [jobA, jobB] } })
          )
        }

        if (query === 'Node') {
          return Promise.resolve(
            jsonResponse({ success: true, data: { hits: [jobA] } })
          )
        }
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<JobSearch />)

    await screen.findByText(/2\/2 skills selected/i)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /fullstack react node/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /react only role/i })).toBeInTheDocument()

    expect(screen.getByText('2 matched skills')).toBeInTheDocument()
    expect(screen.getByText('1 matched skills')).toBeInTheDocument()

    const initialLinks = screen.getAllByRole('link', {
      name: /Fullstack React Node|React Only Role/i,
    })
    expect(initialLinks[0]).toHaveTextContent('Fullstack React Node')

    await user.click(screen.getByRole('button', { name: /2\/2 skills selected/i }))
    await user.click(screen.getByRole('button', { name: 'Node' }))

    await waitFor(() => {
      expect(screen.queryByText('2 matched skills')).not.toBeInTheDocument()
    })

    const updatedLinks = screen.getAllByRole('link', {
      name: /Fullstack React Node|React Only Role/i,
    })
    expect(updatedLinks[0]).toHaveTextContent('React Only Role')
  })

  it('re-ranks text results when skills load after searching', async () => {
    const user = userEvent.setup()
    let resolveDocuments: ((value: Response | PromiseLike<Response>) => void) | null = null

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/documents') {
        return new Promise<Response>((resolve) => {
          resolveDocuments = resolve
        })
      }

      if (url.startsWith('/api/skills/catalog')) {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url === '/api/jobs/save') {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url.startsWith('/api/jobs?')) {
        const query = new URL(url, 'http://localhost').searchParams.get('q') ?? ''
        if (query === 'developer') {
          return Promise.resolve(
            jsonResponse({
              success: true,
              data: {
                hits: [
                  {
                    id: 'job-b',
                    headline: 'No Skill Match Developer',
                    publication_date: '2026-01-30T10:00:00.000Z',
                    description: { text: 'Docker Kubernetes' },
                    occupation: { label: 'Developer' },
                    workplace_address: { region: 'Stockholm' },
                  },
                  {
                    id: 'job-a',
                    headline: 'React Developer',
                    publication_date: '2026-01-01T10:00:00.000Z',
                    description: { text: 'React TypeScript' },
                    occupation: { label: 'Developer' },
                    workplace_address: { region: 'Stockholm' },
                  },
                ],
              },
            })
          )
        }
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    await user.type(searchInput, 'developer')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /no skill match developer/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /react developer/i })).toBeInTheDocument()

    const beforeLinks = screen.getAllByRole('link', {
      name: /No Skill Match Developer|React Developer/i,
    })
    expect(beforeLinks[0]).toHaveTextContent('No Skill Match Developer')

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- set by mock
    resolveDocuments!(
      jsonResponse({
        success: true,
        data: [{ id: 'doc-1', type: 'cv', skills: ['React'] }],
      })
    )

    await screen.findByText(/1\/1 skills selected/i)
    expect(await screen.findByText('1/1 skills match')).toBeInTheDocument()

    await waitFor(() => {
      const afterLinks = screen.getAllByRole('link', {
        name: /No Skill Match Developer|React Developer/i,
      })
      expect(afterLinks[0]).toHaveTextContent('React Developer')
    })
  })

  it('can switch sorting to newest after searching', async () => {
    const user = userEvent.setup()

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/documents') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: ['React', 'Node'] }],
          })
        )
      }

      if (url.startsWith('/api/skills/catalog')) {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url === '/api/jobs/save') {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url === '/api/jobs?q=React&limit=100') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: {
              hits: [
                {
                  id: 'job-old',
                  headline: 'Older Better Match',
                  publication_date: '2026-01-01T10:00:00.000Z',
                  description: { text: 'React Node' },
                  occupation: { label: 'Developer' },
                  workplace_address: { region: 'Stockholm' },
                },
                {
                  id: 'job-new',
                  headline: 'Newer Worse Match',
                  publication_date: '2026-01-30T10:00:00.000Z',
                  description: { text: 'React' },
                  occupation: { label: 'Developer' },
                  workplace_address: { region: 'Stockholm' },
                },
              ],
            },
          })
        )
      }

      if (url === '/api/jobs?q=Node&limit=100') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: {
              hits: [
                {
                  id: 'job-old',
                  headline: 'Older Better Match',
                  publication_date: '2026-01-01T10:00:00.000Z',
                  description: { text: 'React Node' },
                  occupation: { label: 'Developer' },
                  workplace_address: { region: 'Stockholm' },
                },
              ],
            },
          })
        )
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<JobSearch />)

    await screen.findByText(/2\/2 skills selected/i)
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /older better match/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /newer worse match/i })).toBeInTheDocument()

    const beforeLinks = screen.getAllByRole('link', {
      name: /Older Better Match|Newer Worse Match/i,
    })
    expect(beforeLinks[0]).toHaveTextContent('Older Better Match')

    await user.click(screen.getByRole('combobox', { name: /sort/i }))
    await user.click(await screen.findByRole('option', { name: /newest/i }))

    await waitFor(() => {
      const afterLinks = screen.getAllByRole('link', {
        name: /Older Better Match|Newer Worse Match/i,
      })
      expect(afterLinks[0]).toHaveTextContent('Newer Worse Match')
    })
  })

  it('filters out expired jobs when deadline filter is open', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-02-01T12:00:00.000Z'))
    try {
      const user = userEvent.setup()

      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = typeof input === 'string' ? input : input.toString()

        if (url === '/api/documents') {
          return Promise.resolve(
            jsonResponse({
              success: true,
              data: [{ id: 'doc-1', type: 'cv', skills: [] }],
            })
          )
        }

        if (url.startsWith('/api/skills/catalog')) {
          return Promise.resolve(jsonResponse({ success: true, data: [] }))
        }

        if (url === '/api/jobs/save') {
          return Promise.resolve(jsonResponse({ success: true, data: [] }))
        }

        if (url.startsWith('/api/jobs?')) {
          const query = new URL(url, 'http://localhost').searchParams.get('q') ?? ''
          if (query === 'developer') {
            return Promise.resolve(
              jsonResponse({
                success: true,
                data: {
                  hits: [
                    {
                      id: 'job-expired',
                      headline: 'Expired Developer',
                      publication_date: '2026-01-20T10:00:00.000Z',
                      application_deadline: '2026-01-25T10:00:00.000Z',
                      workplace_address: { region: 'Stockholm' },
                    },
                    {
                      id: 'job-open',
                      headline: 'Open Developer',
                      publication_date: '2026-01-20T10:00:00.000Z',
                      application_deadline: '2026-03-01T10:00:00.000Z',
                      workplace_address: { region: 'Stockholm' },
                    },
                  ],
                },
              })
            )
          }
        }

        return Promise.reject(new Error(`Unexpected fetch: ${url}`))
      })

      render(<JobSearch />)

      const searchInput = await screen.findByPlaceholderText(/search by job title/i)
      await user.type(searchInput, 'developer')
      await user.click(screen.getByRole('button', { name: /^search$/i }))

      expect(await screen.findByRole('link', { name: /expired developer/i })).toBeInTheDocument()
      expect(await screen.findByRole('link', { name: /open developer/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /filters/i }))
      await user.click(screen.getByRole('combobox', { name: /deadline/i }))
      await user.click(await screen.findByRole('option', { name: /open \(not expired\)/i }))
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /expired developer/i })).not.toBeInTheDocument()
      })
      expect(screen.getByRole('link', { name: /open developer/i })).toBeInTheDocument()
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('filters jobs by working hours type', async () => {
    const user = userEvent.setup()

    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/documents') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: [] }],
          })
        )
      }

      if (url.startsWith('/api/skills/catalog')) {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url === '/api/jobs/save') {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url.startsWith('/api/jobs?')) {
        const query = new URL(url, 'http://localhost').searchParams.get('q') ?? ''
        if (query === 'developer') {
          return Promise.resolve(
            jsonResponse({
              success: true,
              data: {
                hits: [
                  {
                    id: 'job-full',
                    headline: 'Full-time Developer',
                    publication_date: '2026-01-20T10:00:00.000Z',
                    application_deadline: '2026-03-01T10:00:00.000Z',
                    working_hours_type: { label: 'Heltid' },
                    workplace_address: { region: 'Stockholm' },
                  },
                  {
                    id: 'job-part',
                    headline: 'Part-time Developer',
                    publication_date: '2026-01-20T10:00:00.000Z',
                    application_deadline: '2026-03-01T10:00:00.000Z',
                    working_hours_type: { label: 'Deltid' },
                    workplace_address: { region: 'Stockholm' },
                  },
                ],
              },
            })
          )
        }
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    await user.type(searchInput, 'developer')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    expect(await screen.findByRole('link', { name: /full-time developer/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /part-time developer/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByRole('combobox', { name: /working hours/i }))
    await user.click(await screen.findByRole('option', { name: /full-time/i }))
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /part-time developer/i })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /full-time developer/i })).toBeInTheDocument()
  })

  it('aborts in-flight text search on unmount', async () => {
    const user = userEvent.setup()
    let requestAborted = false

    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/documents') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: [] }],
          })
        )
      }

      if (url.startsWith('/api/skills/catalog')) {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url === '/api/jobs/save') {
        return Promise.resolve(jsonResponse({ success: true, data: [] }))
      }

      if (url.includes('/api/jobs?q=developer')) {
        return new Promise<Response>((resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            requestAborted = true
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const view = render(<JobSearch />)

    const searchInput = await screen.findByPlaceholderText(/search by job title/i)
    await user.type(searchInput, 'developer')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    view.unmount()
    await waitFor(() => {
      expect(requestAborted).toBe(true)
    })
  })
})
