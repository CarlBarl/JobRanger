import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BatchResultsModal } from './BatchResultsModal'

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: any) => {
    const translations: Record<string, string> = {
      'dashboard.batchResults.title': 'Skills Regeneration Results',
      'dashboard.batchResults.summary': 'Updated {updated} of {total} CVs',
      'dashboard.batchResults.updated': 'Successfully Updated',
      'dashboard.batchResults.failed': 'Failed to Update',
      'dashboard.batchResults.skipped': 'Skipped',
      'dashboard.batchResults.noResults': 'No documents to process',
      'dashboard.batchResults.closeAndRefresh': 'Close and Refresh'
    }
    let result = translations[key] || key
    if (values) {
      Object.keys(values).forEach(k => {
        result = result.replace(`{${k}}`, values[k])
      })
    }
    return result
  }
}))

describe('BatchResultsModal', () => {
  const mockResults = {
    total: 3,
    updated: [
      {
        documentId: 'cv-1',
        previousSkills: ['OldSkill'],
        newSkills: ['JavaScript', 'React', 'TypeScript'],
        added: ['JavaScript', 'React', 'TypeScript'],
        removed: ['OldSkill'],
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        documentId: 'cv-2',
        previousSkills: [],
        newSkills: ['Python', 'Django'],
        added: ['Python', 'Django'],
        removed: [],
        createdAt: '2024-01-02T00:00:00.000Z'
      }
    ],
    failed: [
      {
        documentId: 'cv-3',
        error: 'Gemini API timeout',
        createdAt: '2024-01-03T00:00:00.000Z'
      }
    ],
    skipped: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders when open with results', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={mockResults}
        />
      )

      expect(screen.getByText('Skills Regeneration Results')).toBeInTheDocument()
      expect(screen.getByText(/Updated 2 of 3 CVs/i)).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={false}
          onClose={onClose}
          results={mockResults}
        />
      )

      expect(screen.queryByText('Skills Regeneration Results')).not.toBeInTheDocument()
    })

    it('renders null results message', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={null}
        />
      )

      expect(screen.getByText('No documents to process')).toBeInTheDocument()
    })

    it('renders empty results', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={{ total: 0, updated: [], failed: [], skipped: [] }}
        />
      )

      expect(screen.getByText(/Updated 0 of 0 CVs/i)).toBeInTheDocument()
    })
  })

  describe('Sections Display', () => {
    it('shows successfully updated section', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={mockResults}
        />
      )

      expect(screen.getByText('Successfully Updated')).toBeInTheDocument()
      // Component shows "previousSkills.length → newSkills.length skills"
      expect(screen.getByText(/1 → 3/)).toBeInTheDocument()
      expect(screen.getByText(/0 → 2/)).toBeInTheDocument()
    })

    it('shows failed section', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={mockResults}
        />
      )

      expect(screen.getByText('Failed to Update')).toBeInTheDocument()
      expect(screen.getByText('Gemini API timeout')).toBeInTheDocument()
    })

    it('shows skipped section when present', () => {
      const onClose = vi.fn()
      const resultsWithSkipped = {
        ...mockResults,
        skipped: [
          {
            documentId: 'cv-4',
            reason: 'No parsed content available',
            createdAt: '2024-01-04T00:00:00.000Z'
          }
        ]
      }

      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={resultsWithSkipped}
        />
      )

      expect(screen.getByText('Skipped')).toBeInTheDocument()
      expect(screen.getByText('No parsed content available')).toBeInTheDocument()
    })

    it('hides sections with no items', () => {
      const onClose = vi.fn()
      const onlyUpdatedResults = {
        total: 2,
        updated: mockResults.updated,
        failed: [],
        skipped: []
      }

      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={onlyUpdatedResults}
        />
      )

      expect(screen.getByText('Successfully Updated')).toBeInTheDocument()
      expect(screen.queryByText('Failed to Update')).not.toBeInTheDocument()
      expect(screen.queryByText('Skipped')).not.toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClose and router.refresh when close button clicked', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={mockResults}
        />
      )

      const closeButton = screen.getByText('Close and Refresh')
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      const onClose = vi.fn()
      render(
        <BatchResultsModal
          open={true}
          onClose={onClose}
          results={mockResults}
        />
      )

      // Dates should be formatted as sv-SE locale strings
      expect(screen.getByText('2024-01-01')).toBeInTheDocument()
      expect(screen.getByText('2024-01-02')).toBeInTheDocument()
      expect(screen.getByText('2024-01-03')).toBeInTheDocument()
    })
  })
})
