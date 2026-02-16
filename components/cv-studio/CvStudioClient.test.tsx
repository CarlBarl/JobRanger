import { describe, expect, it, vi } from 'vitest'
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
        initialCvDocument={{
          id: 'doc-1',
          createdAt: '2026-02-16T10:00:00.000Z',
          parsedContent: 'My CV',
        }}
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
  })

  it('shows upload state when no cv exists', () => {
    render(
      <CvStudioClient
        userTier="PRO"
        initialCvDocument={null}
        savedJobs={[]}
      />
    )

    expect(screen.getByText('Upload a CV to start')).toBeInTheDocument()
  })
})
