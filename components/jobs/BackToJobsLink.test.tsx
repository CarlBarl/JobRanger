import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { BackToJobsLink } from './BackToJobsLink'

const mockBack = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}))

describe('BackToJobsLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses router.back when navigation history exists', async () => {
    const user = userEvent.setup()
    window.history.replaceState({ idx: 1 }, '')

    render(<BackToJobsLink>Back</BackToJobsLink>)
    await user.click(screen.getByRole('link', { name: /back/i }))

    expect(mockBack).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('falls back to router.push when there is no navigation history', async () => {
    const user = userEvent.setup()
    window.history.replaceState({ idx: 0 }, '')

    render(<BackToJobsLink>Back</BackToJobsLink>)
    await user.click(screen.getByRole('link', { name: /back/i }))

    expect(mockPush).toHaveBeenCalledWith('/jobs')
    expect(mockBack).not.toHaveBeenCalled()
  })
})

