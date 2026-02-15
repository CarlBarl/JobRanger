import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { SavedJobsList } from './SavedJobsList'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

global.fetch = vi.fn()

const activeJob = {
  afJobId: 'job-1',
  headline: 'AI Engineer',
  employer: 'Lovable Labs',
  location: 'Stockholm',
  occupation: 'Software',
  deadline: '2026-07-02T00:00:00Z',
  webpageUrl: 'https://af.se/job-1',
  isStale: false,
}

const staleJob = {
  afJobId: 'job-2',
  headline: 'Old Position',
  employer: 'Gone Corp',
  location: 'Gothenburg',
  occupation: 'Admin',
  deadline: null,
  webpageUrl: null,
  isStale: true,
}

describe('SavedJobsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders saved jobs with headline and employer', () => {
    render(<SavedJobsList jobs={[activeJob]} totalCount={1} />)

    expect(screen.getByText('AI Engineer')).toBeInTheDocument()
    expect(screen.getByText('Lovable Labs')).toBeInTheDocument()
    expect(screen.getByText('Stockholm')).toBeInTheDocument()
  })

  it('shows total count', () => {
    render(<SavedJobsList jobs={[activeJob]} totalCount={5} />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows empty state when no jobs', () => {
    render(<SavedJobsList jobs={[]} totalCount={0} />)

    expect(screen.getByText(/no saved jobs yet/i)).toBeInTheDocument()
  })

  it('shows "View all jobs" link when totalCount > 3', () => {
    render(<SavedJobsList jobs={[activeJob]} totalCount={4} />)

    expect(screen.getByText(/view all jobs/i)).toBeInTheDocument()
  })

  it('does not show "View all jobs" when totalCount <= 3', () => {
    render(<SavedJobsList jobs={[activeJob]} totalCount={2} />)

    expect(screen.queryByText(/view all jobs/i)).not.toBeInTheDocument()
  })

  it('renders deadline for active jobs', () => {
    render(<SavedJobsList jobs={[activeJob]} totalCount={1} />)

    expect(screen.getByText(/deadline/i)).toBeInTheDocument()
  })

  it('shows expired badge for stale jobs', () => {
    render(<SavedJobsList jobs={[staleJob]} totalCount={1} />)

    expect(screen.getByText('Expired')).toBeInTheDocument()
  })

  it('shows "Listing has expired" text for stale jobs', () => {
    render(<SavedJobsList jobs={[staleJob]} totalCount={1} />)

    expect(screen.getByText(/listing has expired/i)).toBeInTheDocument()
  })

  it('links active jobs to internal job detail page', () => {
    render(<SavedJobsList jobs={[activeJob]} totalCount={1} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jobs/job-1')
    expect(link).not.toHaveAttribute('target')
  })

  it('does not link stale jobs', () => {
    render(<SavedJobsList jobs={[staleJob]} totalCount={1} />)

    const links = screen.queryAllByRole('link')
    // Only the "View all" link may exist, but the stale job itself should not be a link
    const staleLink = links.find((l) => l.textContent?.includes('Old Position'))
    expect(staleLink).toBeUndefined()
  })

  it('calls DELETE API and removes job when unsave button is clicked', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

    render(<SavedJobsList jobs={[staleJob]} totalCount={1} />)

    const removeButton = screen.getByTitle(/remove saved job/i)
    await user.click(removeButton)

    expect(global.fetch).toHaveBeenCalledWith('/api/jobs/save/job-2', {
      method: 'DELETE',
    })

    await waitFor(() => {
      expect(screen.queryByText('Old Position')).not.toBeInTheDocument()
    })
  })

  it('does not remove job when DELETE fails', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false })

    render(<SavedJobsList jobs={[staleJob]} totalCount={1} />)

    const removeButton = screen.getByTitle(/remove saved job/i)
    await user.click(removeButton)

    await waitFor(() => {
      expect(screen.getByText('Old Position')).toBeInTheDocument()
    })
  })

  it('refreshes the page after successful unsave', async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

    render(<SavedJobsList jobs={[staleJob]} totalCount={1} />)

    const removeButton = screen.getByTitle(/remove saved job/i)
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('renders both active and stale jobs together', () => {
    render(<SavedJobsList jobs={[activeJob, staleJob]} totalCount={2} />)

    expect(screen.getByText('AI Engineer')).toBeInTheDocument()
    expect(screen.getByText('Old Position')).toBeInTheDocument()
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })
})
