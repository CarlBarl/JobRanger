import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { JobActions } from './JobActions'

describe('JobActions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saves a job', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { id: 'sj1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const user = userEvent.setup()
    render(<JobActions afJobId="123" />)

    await user.click(screen.getByRole('button', { name: /save job/i }))

    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
  })

  it('shows error when generating letter without a CV', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const user = userEvent.setup()
    render(<JobActions afJobId="123" />)

    await user.click(screen.getByRole('button', { name: /generate letter/i }))

    expect(await screen.findByText(/upload a cv/i)).toBeInTheDocument()
  })

  it('generates a letter using the latest CV document', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'doc-1', type: 'cv' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 'letter-1', content: 'x', createdAt: 'now' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )

    const user = userEvent.setup()
    render(<JobActions afJobId="123" />)

    await user.click(screen.getByRole('button', { name: /generate letter/i }))

    expect(await screen.findByText(/letter-1/)).toBeInTheDocument()
  })
})

