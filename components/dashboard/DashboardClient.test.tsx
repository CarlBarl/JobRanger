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
    createdAt: '2025-01-01',
    parsedContent: 'CV content',
    fileUrl: 'https://example.com/cv.pdf',
    skills: null,
  }

  const personalLetter = {
    id: 'pl-1',
    createdAt: '2025-01-02',
    parsedContent: 'Personal letter content',
    fileUrl: 'https://example.com/letter.pdf',
    skills: null,
  }

  it('opens the CV preview when pressing the CV card', async () => {
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

  it('opens the personal letter preview when pressing the personal letter card', async () => {
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

  describe('Batch Skills Regeneration', () => {
    it('shows batch skills button when CV exists', () => {
      render(
        <DashboardClient
          cvDocument={cvDocument}
          personalLetter={personalLetter}
          cvUploadComponent={<div />}
          personalLetterUploadComponent={<div />}
        />
      )

      expect(screen.getByRole('button', { name: /regenerate all skills/i })).toBeInTheDocument()
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

      expect(screen.queryByRole('button', { name: /regenerate all skills/i })).not.toBeInTheDocument()
    })

    it('handles successful batch regeneration', async () => {
      const user = userEvent.setup()
      const mockResults = {
        total: 2,
        updated: [
          {
            documentId: 'cv-1',
            skills: ['JavaScript', 'React'],
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

      const button = screen.getByRole('button', { name: /regenerate all skills/i })
      await user.click(button)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/skills/batch', { method: 'POST' })
      })

      await waitFor(() => {
        expect(screen.getByText('Skills Regeneration Results')).toBeInTheDocument()
      })
    })

    it('shows loading state during regeneration', async () => {
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

      const button = screen.getByRole('button', { name: /regenerate all skills/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/regenerating skills/i)).toBeInTheDocument()
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

      const button = screen.getByRole('button', { name: /regenerate all skills/i })
      await user.click(button)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Batch skills regeneration error:',
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

      const button = screen.getByRole('button', { name: /regenerate all skills/i })
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
