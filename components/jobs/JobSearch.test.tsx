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
      expect(calledUrls).toContain('/api/jobs?q=React')
      expect(calledUrls).toContain('/api/jobs?q=TypeScript')
      expect(calledUrls).not.toContain('/api/jobs?q=Node')
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
      expect(calledUrls).toContain('/api/jobs?q=developer')
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
})
