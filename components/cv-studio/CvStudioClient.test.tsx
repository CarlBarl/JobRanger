import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { CvStudioClient } from './CvStudioClient'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
  }),
}))

describe('CvStudioClient', () => {
  it('shows locked action state for free users', () => {
    render(
      <CvStudioClient
        userTier="FREE"
        initialCvDocuments={[
          {
            id: 'doc-1',
            createdAt: '2026-02-16T10:00:00.000Z',
            parsedContent: 'My CV',
          },
        ]}
        savedJobs={[
          {
            afJobId: '123',
            headline: 'Warehouse role',
            employer: 'Acme',
            location: 'Orebro',
          },
        ]}
      />
    )

    expect(screen.getByText('PRO feature')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate feedback' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apply AI edits' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Show CV' })).toBeInTheDocument()
  })

  it('shows upload state when no cv exists', () => {
    render(
      <CvStudioClient
        userTier="PRO"
        initialCvDocuments={[]}
        savedJobs={[]}
      />
    )

    expect(screen.getByText('Upload a CV to start')).toBeInTheDocument()
  })

  it('shows current cv contents when expanded', async () => {
    const user = userEvent.setup()

    render(
      <CvStudioClient
        userTier="PRO"
        initialCvDocuments={[
          {
            id: 'doc-1',
            createdAt: '2026-02-16T10:00:00.000Z',
            parsedContent: 'My CV content',
          },
        ]}
        savedJobs={[]}
      />
    )

    expect(screen.queryByText('My CV content')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show CV' }))
    expect(screen.getByText('My CV content')).toBeInTheDocument()
  })

  it('switching cv versions updates the preview', async () => {
    const user = userEvent.setup()

    render(
      <CvStudioClient
        userTier="PRO"
        initialCvDocuments={[
          {
            id: 'doc-new',
            createdAt: '2026-02-16T10:00:00.000Z',
            parsedContent: 'Newest CV',
          },
          {
            id: 'doc-old',
            createdAt: '2026-02-01T10:00:00.000Z',
            parsedContent: 'Older CV',
          },
        ]}
        savedJobs={[]}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Show CV' }))
    expect(screen.getByText('Newest CV')).toBeInTheDocument()
    expect(screen.queryByText('Older CV')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Choose CV version' }))
    const options = await screen.findAllByRole('option')
    await user.click(options[1])

    expect(screen.getByText('Older CV')).toBeInTheDocument()
    expect(screen.queryByText('Newest CV')).not.toBeInTheDocument()
  })
})

