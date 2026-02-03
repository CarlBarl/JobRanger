import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@/lib/test-utils'
import { DashboardClient } from './DashboardClient'

describe('DashboardClient', () => {
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

  it('renders links to document editor pages', () => {
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    const links = screen.getAllByRole('link', { name: /open in new tab/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/documents/cv-1')
    expect(links[1]).toHaveAttribute('href', '/documents/pl-1')
  })
})
