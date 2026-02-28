import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { UploadDialog } from './UploadDialog'

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
    uploadNewCV: 'Upload New CV',
    uploadNewPersonalLetter: 'Upload New Personal Letter',
    replaceDocumentDescription: 'Upload a new file to replace your current document.',
  },
  upload: {
    dropCV: 'Drag and drop or click to upload CV',
    uploadCV: 'Upload CV',
    uploading: 'Uploading...',
    uploadFailed: 'Upload failed',
    dropPersonalLetter: 'Drag and drop or click to upload Personal Letter',
    maxSize: 'Max 5MB',
    uploadPersonalLetter: 'Upload Personal Letter',
    invalidType: 'Invalid file type',
    tooLarge: 'File too large',
  },
}

describe('UploadDialog', () => {
  it('renders CV upload when documentType is cv', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UploadDialog
          open={true}
          onOpenChange={() => {}}
          documentType="cv"
        />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('Upload New CV')).toBeInTheDocument()
    expect(screen.getByText('Upload a new file to replace your current document.')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop or click to upload CV')).toBeInTheDocument()
  })

  it('renders personal letter upload when documentType is personal_letter', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UploadDialog
          open={true}
          onOpenChange={() => {}}
          documentType="personal_letter"
        />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('Upload New Personal Letter')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop or click to upload Personal Letter')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <UploadDialog
          open={false}
          onOpenChange={() => {}}
          documentType="cv"
        />
      </NextIntlClientProvider>
    )

    expect(screen.queryByText('Upload New CV')).not.toBeInTheDocument()
  })
})
