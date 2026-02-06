import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render as rtlRender } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
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

describe('JobSearch skill search', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders localized labels', async () => {
    const messages = {
      jobs: {
        searchWithSkillsTitle: 'Search with skill tags',
        searchWithSkillsDescription: 'Pick skills from your CV',
        loadingSkills: 'Loading skills...',
        skillsErrorUnexpected: 'Unexpected skills response',
        skillsErrorFailed: 'Skills failed',
        noSkillsFound: 'No skills found',
        searchWithSelectedSkills: 'Search selected',
        searchWithAllSkills: 'Search all skills',
        searchPlaceholder: 'Search jobs',
        search: 'Find',
        searching: 'Finding...',
        errorNoSearchTerm: 'Enter a search term',
        errorSelectSkill: 'Select at least one skill',
        errorNoSkills: 'No skills to search',
        errorUnexpectedResponse: 'Unexpected response',
        errorSearchFailed: 'Search failed',
      },
    }

    mockFetchWithSkills(['React'])

    rtlRender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobSearch />
      </NextIntlClientProvider>
    )

    expect(
      await screen.findByText('Search with skill tags')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find' })).toBeInTheDocument()
  })

  it('searches using selected skills', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchWithSkills(['React', 'TypeScript', 'Node'])

    render(<JobSearch />)

    const nodeCheckbox = await screen.findByLabelText('Node')
    await user.click(nodeCheckbox)

    await user.click(
      screen.getByRole('button', { name: /search with selected skills/i })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/jobs?q=React%20TypeScript'
      )
    })
  })

  it('searches using all skills even when some are deselected', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchWithSkills(['React', 'TypeScript', 'Node'])

    render(<JobSearch />)

    const nodeCheckbox = await screen.findByLabelText('Node')
    await user.click(nodeCheckbox)

    await user.click(
      screen.getByRole('button', { name: /search with all skills/i })
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/jobs?q=React%20TypeScript%20Node'
      )
    })
  })
})
