import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { DocumentPreviewDialog } from './DocumentPreviewDialog'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

const messages = {
  common: {
    close: 'Close',
    upload: 'Upload',
    error: 'An error occurred',
  },
  dashboard: {
    noContent: 'No content available',
    openInNewTab: 'Open in new tab',
    close: 'Close',
    uploadNewFile: 'Upload New',
    uploadNewCV: 'Upload New CV',
    uploadNewPersonalLetter: 'Upload New Personal Letter',
    replaceDocumentDescription: 'Upload a new file to replace your current document.',
  },
  upload: {
    dropCV: 'Click to upload CV',
    uploadCV: 'Upload CV',
    uploading: 'Uploading...',
    uploadFailed: 'Upload failed',
    dropPersonalLetter: 'Click to upload Personal Letter',
    maxSize: 'Max 5MB',
    uploadPersonalLetter: 'Upload Personal Letter',
    invalidType: 'Invalid file type',
    tooLarge: 'File too large',
  },
}

describe('DocumentPreviewDialog', () => {
  it('renders document content', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DocumentPreviewDialog
          open={true}
          onOpenChange={() => {}}
          title="My CV"
          content="Resume content here"
          fileUrl="https://example.com/file.pdf"
          documentId="123"
          type="cv"
        />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('My CV')).toBeInTheDocument()
    expect(screen.getByText('Resume content here')).toBeInTheDocument()
  })

  it('renders Upload New button', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DocumentPreviewDialog
          open={true}
          onOpenChange={() => {}}
          title="My CV"
          content="Resume content"
          fileUrl="https://example.com/file.pdf"
          documentId="123"
          type="cv"
        />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('button', { name: /upload new/i })).toBeInTheDocument()
  })

  it('opens upload dialog when Upload New button is clicked', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DocumentPreviewDialog
          open={true}
          onOpenChange={() => {}}
          title="My CV"
          content="Resume content"
          fileUrl="https://example.com/file.pdf"
          documentId="123"
          type="cv"
        />
      </NextIntlClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /upload new/i }))

    expect(screen.getByText('Upload New CV')).toBeInTheDocument()
    expect(screen.getByText('Upload a new file to replace your current document.')).toBeInTheDocument()
  })

  it('opens personal letter upload dialog when type is personal_letter', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <DocumentPreviewDialog
          open={true}
          onOpenChange={() => {}}
          title="My Letter"
          content="Letter content"
          fileUrl="https://example.com/file.pdf"
          documentId="456"
          type="personal_letter"
        />
      </NextIntlClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /upload new/i }))

    expect(screen.getByText('Upload New Personal Letter')).toBeInTheDocument()
  })
})
