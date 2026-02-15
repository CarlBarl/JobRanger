import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BatchSkillsButton } from './BatchSkillsButton'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'dashboard.regenerateAllSkills': 'Update skills from CV',
      'dashboard.regenerating': 'Updating skills...'
    }
    return translations[key] || key
  }
}))

describe('BatchSkillsButton', () => {
  describe('Rendering', () => {
    it('renders button with correct text when not loading', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={false} />)

      const button = screen.getByRole('button', { name: /update skills from cv/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })

    it('renders with loading state', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByText(/updating skills/i)).toBeInTheDocument()
    })

    it('renders as disabled when disabled prop is true', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={false} disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('renders as disabled when both loading and disabled', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={true} disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Interactions', () => {
    it('calls onTrigger when clicked', async () => {
      const onTrigger = vi.fn().mockResolvedValue(undefined)
      render(<BatchSkillsButton onTrigger={onTrigger} loading={false} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it('does not call onTrigger when disabled', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={false} disabled={true} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onTrigger).not.toHaveBeenCalled()
    })

    it('does not call onTrigger when loading', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={true} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onTrigger).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={false} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Update skills from CV')
    })

    it('has aria-busy when loading', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={true} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('does not have aria-busy when not loading', () => {
      const onTrigger = vi.fn()
      render(<BatchSkillsButton onTrigger={onTrigger} loading={false} />)

      const button = screen.getByRole('button')
      expect(button).not.toHaveAttribute('aria-busy', 'true')
    })
  })
})
