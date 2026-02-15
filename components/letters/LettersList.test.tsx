import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { LettersList, type LetterListItem } from './LettersList'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

global.fetch = vi.fn()

describe('LettersList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    Object.defineProperty(window, 'confirm', {
      value: vi.fn(() => true),
      configurable: true,
    })
  })

  it('does not show job id as the title', () => {
    const letters: LetterListItem[] = [
      {
        id: 'l1',
        afJobId: '123',
        jobTitle: null,
        content: 'Hello',
        createdAt: '2026-02-15T12:00:00.000Z',
        savedJob: null,
      },
    ]

    render(<LettersList initialLetters={letters} />)

    const titleLink = screen.getByRole('link', { name: 'Unknown job' })
    expect(titleLink).toHaveAttribute('href', '/jobs/123')
    expect(screen.queryByText('123')).not.toBeInTheDocument()
    expect(screen.queryByText(/job id/i)).not.toBeInTheDocument()
  })

  it('copies the full letter content', async () => {
    const user = userEvent.setup()
    const letters: LetterListItem[] = [
      {
        id: 'l1',
        afJobId: '123',
        jobTitle: 'React Developer',
        content: 'Line 1\nLine 2',
        createdAt: '2026-02-15T12:00:00.000Z',
        savedJob: null,
      },
    ]

    render(<LettersList initialLetters={letters} />)

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  it('calls DELETE and removes the letter', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

    const letters: LetterListItem[] = [
      {
        id: 'l1',
        afJobId: '123',
        jobTitle: 'React Developer',
        content: 'Hello',
        createdAt: '2026-02-15T12:00:00.000Z',
        savedJob: null,
      },
    ]

    render(<LettersList initialLetters={letters} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(global.fetch).toHaveBeenCalledWith('/api/letters/l1', { method: 'DELETE' })

    await waitFor(() => {
      expect(screen.queryByTestId('letter-l1')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
