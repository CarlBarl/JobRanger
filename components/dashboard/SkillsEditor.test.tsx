import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { SkillsEditor } from './SkillsEditor'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

global.fetch = vi.fn()

describe('SkillsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Batch Skills Update', () => {
    it('shows batch skills button when documentId exists', () => {
      render(
        <SkillsEditor skills={['JavaScript']} documentId="cv-1" />
      )

      expect(screen.getByRole('button', { name: /update skills from cv/i })).toBeInTheDocument()
    })

    it('does not show batch skills button when no documentId', () => {
      render(
        <SkillsEditor skills={['JavaScript']} documentId={null} />
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
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        failed: [],
        skipped: [],
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockResults }),
      })

      render(
        <SkillsEditor skills={['JavaScript']} documentId="cv-1" />
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
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))

      render(
        <SkillsEditor skills={['JavaScript']} documentId="cv-1" />
      )

      const button = screen.getByRole('button', { name: /update skills from cv/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText(/updating skills/i)).toBeInTheDocument()
      })
    })

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup()
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      render(
        <SkillsEditor skills={['JavaScript']} documentId="cv-1" />
      )

      const button = screen.getByRole('button', { name: /update skills from cv/i })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          "We couldn't update skills right now. Please try again."
        )
      })
    })

    it('refreshes page when modal is closed', async () => {
      const user = userEvent.setup()
      const mockResults = {
        total: 1,
        updated: [],
        failed: [],
        skipped: [],
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockResults }),
      })

      render(
        <SkillsEditor skills={['JavaScript']} documentId="cv-1" />
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
