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
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
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
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/jobs?q=React%20TypeScript%20Node'
      )
    })
  })
})
