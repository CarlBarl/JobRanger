import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { FileUpload } from './FileUpload'

const messages = {
  common: {
    error: 'An error occurred',
  },
  upload: {
    dropCV: 'Click to upload CV (PDF, DOCX, or TXT)',
    uploadCV: 'Upload CV',
    uploading: 'Uploading...',
    uploadFailed: 'Upload failed',
    maxSize: 'Max 5MB',
    invalidType: 'Invalid file type',
    tooLarge: 'File too large',
  },
}

describe('FileUpload', () => {
  it('renders upload prompt', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FileUpload />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('Click to upload CV (PDF, DOCX, or TXT)')).toBeInTheDocument()
    expect(screen.getByText('Max 5MB')).toBeInTheDocument()
  })

  it('renders with card wrapper by default', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FileUpload />
      </NextIntlClientProvider>
    )

    expect(container.querySelector('[class*="rounded-xl"]')).toBeInTheDocument()
  })

  it('renders without card wrapper when variant is embedded', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FileUpload variant="embedded" />
      </NextIntlClientProvider>
    )

    expect(container.querySelector('[class*="rounded-xl"]')).not.toBeInTheDocument()
    expect(screen.getByText('Click to upload CV (PDF, DOCX, or TXT)')).toBeInTheDocument()
  })
})
