import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { JobSearch } from './JobSearch'

describe('JobSearch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and renders job results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            total: { value: 1 },
            hits: [
              {
                id: '1',
                headline: 'Developer',
                employer: { name: 'ACME' },
                workplace_address: { municipality: 'Stockholm' },
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const user = userEvent.setup()
    render(<JobSearch />)

    await user.type(screen.getByLabelText(/search/i), 'developer')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(await screen.findByText('Developer')).toBeInTheDocument()
    expect(screen.getByText('ACME')).toBeInTheDocument()
  })

  it('shows an error message when API returns an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    )

    const user = userEvent.setup()
    render(<JobSearch />)

    await user.type(screen.getByLabelText(/search/i), 'developer')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(await screen.findByText(/not authenticated/i)).toBeInTheDocument()
  })
})

