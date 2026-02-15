import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { JobPreviewStep } from './JobPreviewStep'

interface JobSearchStubProps {
  onFirstSearch?: () => void
}

vi.mock('@/components/jobs/JobSearch', () => ({
  JobSearch: ({ onFirstSearch }: JobSearchStubProps) => (
    <div>
      <div>JobSearchStub</div>
      <button onClick={() => onFirstSearch?.()}>Do Search</button>
    </div>
  ),
}))

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('JobPreviewStep', () => {
  it('shows continue only after first search and continues with saved jobs count', async () => {
    const onComplete = vi.fn()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/jobs/save') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: [{ afJobId: '111' }, { afJobId: '222' }],
          })
        )
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<JobPreviewStep onComplete={onComplete} />)

    expect(screen.getByText('JobSearchStub')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Do Search' }))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(2)
    })

    expect(fetchSpy).toHaveBeenCalledWith('/api/jobs/save')
  })
})
