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
    documentDialogDescription:
      'Review and edit the text we use to match jobs and generate cover letters.',
    openInNewTab: 'Open in new tab',
    close: 'Close',
    uploadNewFile: 'Upload New',
    uploadNewCV: 'Upload New CV',
    uploadNewPersonalLetter: 'Upload New Personal Letter',
    replaceDocumentDescription: 'Upload a new file to replace your current document.',
    edit: 'Edit',
    cancel: 'Cancel',
    editing: 'Editing',
    characters: 'characters',
    saveChanges: 'Save',
    saving: 'Saving...',
    unsavedChanges: 'You have unsaved changes',
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

  describe('Edit Mode', () => {
    it('shows Edit button in preview mode', () => {
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

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    it('switches to edit mode when Edit button is clicked', () => {
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

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      expect(screen.getByRole('textbox', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    it('textarea contains the document content in edit mode', () => {
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

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox', { name: /edit/i }) as HTMLTextAreaElement
      expect(textarea.value).toBe('Resume content')
    })

    it('Save button is disabled when no changes are made', () => {
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

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeDisabled()
    })

    it('Save button is enabled when content is edited', () => {
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

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox', { name: /edit/i })
      fireEvent.change(textarea, { target: { value: 'Updated resume content' } })

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).not.toBeDisabled()
    })

    it('shows unsaved changes indicator when content is edited', () => {
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

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox', { name: /edit/i })
      fireEvent.change(textarea, { target: { value: 'Updated resume content' } })

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument()
    })

    it('calls API with correct payload when Save is clicked', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      )

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

      fireEvent.click(screen.getByRole('button', { name: /edit/i }))

      const textarea = screen.getByRole('textbox', { name: /edit/i })
      fireEvent.change(textarea, { target: { value: 'Updated resume content' } })

      const saveButton = screen.getByRole('button', { name: /save/i })
      fireEvent.click(saveButton)

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/documents/123',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parsedContent: 'Updated resume content' }),
        })
      )
    })

    it('resets to preview mode when dialog is reopened', () => {
      const { rerender } = render(
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

      // Switch to edit mode
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      expect(screen.getByRole('textbox', { name: /edit/i })).toBeInTheDocument()

      // Close dialog
      rerender(
        <NextIntlClientProvider locale="en" messages={messages}>
          <DocumentPreviewDialog
            open={false}
            onOpenChange={() => {}}
            title="My CV"
            content="Resume content"
            fileUrl="https://example.com/file.pdf"
            documentId="123"
            type="cv"
          />
        </NextIntlClientProvider>
      )

      // Reopen dialog
      rerender(
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

      // Should be back in preview mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })
  })
})
