import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within, waitFor } from '@/lib/test-utils'
import { DashboardClient } from './DashboardClient'

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}))

// Mock fetch
global.fetch = vi.fn()

describe('DashboardClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const cvDocument = {
    id: 'cv-1',
    createdAt: '2025-01-01T18:56:00.000Z',
    parsedContent: 'CV content here for preview',
    fileUrl: 'https://example.com/cv.pdf',
    skills: null,
  }

  const personalLetter = {
    id: 'pl-1',
    createdAt: '2025-01-02T22:23:00.000Z',
    parsedContent: 'Personal letter content here for preview',
    fileUrl: 'https://example.com/letter.pdf',
    skills: null,
  }

  it('opens the CV preview when clicking the CV card', async () => {
    const user = userEvent.setup()
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /view document: your cv/i })
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/your cv/i)).toBeInTheDocument()
  })

  it('opens the personal letter preview when clicking the letter card', async () => {
    const user = userEvent.setup()
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: /view document: your personal letter/i,
      })
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/your personal letter/i)).toBeInTheDocument()
  })

  it('shows preview text in CV card', () => {
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    expect(screen.getByText(/CV content here/)).toBeInTheDocument()
  })

  it('shows preview text in personal letter card', () => {
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    expect(screen.getByText(/Personal letter content/)).toBeInTheDocument()
  })

  it('shows formatted date and time on cards', () => {
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    // Should include time component (formatted via sv-SE locale)
    const dateElements = screen.getAllByText(/2025/)
    expect(dateElements.length).toBeGreaterThanOrEqual(2)
  })

  it('opens upload dialog without opening preview when clicking upload button on CV card', async () => {
    const user = userEvent.setup()
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    // The upload button uses stopPropagation so it shouldn't trigger the card click
    const uploadButtons = screen.getAllByText(/upload new/i)
    await user.click(uploadButtons[0])

    // Upload dialog should open, not the preview dialog
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByText(/your cv/i)).not.toBeInTheDocument()
  })

  it('shows upload component when no CV exists', () => {
    render(
      <DashboardClient
        cvDocument={null}
        personalLetter={personalLetter}
        cvUploadComponent={<div data-testid="cv-upload" />}
        personalLetterUploadComponent={<div />}
      />
    )

    expect(screen.getByTestId('cv-upload')).toBeInTheDocument()
    expect(screen.getByText(/no cv uploaded yet/i)).toBeInTheDocument()
  })

  it('shows upload component when no personal letter exists', () => {
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={null}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div data-testid="letter-upload" />}
      />
    )

    expect(screen.getByTestId('letter-upload')).toBeInTheDocument()
    expect(screen.getByText(/no personal letter uploaded yet/i)).toBeInTheDocument()
  })

  describe('Batch Skills Update', () => {
    it('shows batch skills button when CV exists', () => {
      render(
        <DashboardClient
          cvDocument={cvDocument}
          personalLetter={personalLetter}
          cvUploadComponent={<div />}
          personalLetterUploadComponent={<div />}
        />
      )

      expect(screen.getByRole('button', { name: /update skills from cv/i })).toBeInTheDocument()
    })

    it('does not show batch skills button when no CV', () => {
      render(
        <DashboardClient
          cvDocument={null}
          personalLetter={personalLetter}
          cvUploadComponent={<div />}
          personalLetterUploadComponent={<div />}
        />
      )

      expect(screen.queryByRole('button', { name: /update skills from cv/i })).not.toBeInTheDocument()
    })

    it('handles successful batch regeneration', async () => {
      const user = userEvent.setup()
      const mockResults = {
        total: 2,
        updated: [
          {
            documentId: 'cv-1',
            previousSkills: [],
            newSkills: ['JavaScript', 'React'],
            added: ['JavaScript', 'React'],
            removed: [],
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        failed: [],
        skipped: []
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockResults })
      })

      render(
        <DashboardClient
          cvDocument={cvDocument}
          personalLetter={personalLetter}
          cvUploadComponent={<div />}
          personalLetterUploadComponent={<div />}
        />
      )

      const button = screen.getByRole('button', { name: /update skills from cv/i })
      await user.click(button)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/skills/batch', { method: 'POST' })
      })

      await waitFor(() => {
        expect(screen.getByText('Skills Update Results')).toBeInTheDocument()
      })
    })

    it('shows loading state during update', async () => {
      const user = userEvent.setup()
      ;(global.fetch as any).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <DashboardClient
          cvDocument={cvDocument}
          personalLetter={personalLetter}
          cvUploadComponent={<div />}
          personalLetterUploadComponent={<div />}
        />
      )

      const button = screen.getByRole('button', { name: /update skills from cv/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/updating skills/i)).toBeInTheDocument()
      })
    })

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      render(
        <DashboardClient
          cvDocument={cvDocument}
          personalLetter={personalLetter}
          cvUploadComponent={<div />}
          personalLetterUploadComponent={<div />}
        />
      )

      const button = screen.getByRole('button', { name: /update skills from cv/i })
      await user.click(button)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Batch skills update error:',
          expect.any(Error)
        )
      })

      consoleError.mockRestore()
    })

    it('refreshes page when modal is closed', async () => {
      const user = userEvent.setup()
      const mockResults = {
        total: 1,
        updated: [],
        failed: [],
        skipped: []
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockResults })
      })

      render(
        <DashboardClient
          cvDocument={cvDocument}
          personalLetter={personalLetter}
          cvUploadComponent={<div />}
          personalLetterUploadComponent={<div />}
        />
      )

      const button = screen.getByRole('button', { name: /update skills from cv/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Close and Refresh')).toBeInTheDocument()
      })

      const closeButton = screen.getByText('Close and Refresh')
      await user.click(closeButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })
  })
})
