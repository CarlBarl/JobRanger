import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { FileUpload } from './FileUpload'

const messages = {
  common: {
    error: 'An error occurred',
  },
  upload: {
    dropCV: 'Drag and drop or click to upload CV (PDF, DOCX, or TXT)',
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

    expect(screen.getByText('Drag and drop or click to upload CV (PDF, DOCX, or TXT)')).toBeInTheDocument()
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
    expect(screen.getByText('Drag and drop or click to upload CV (PDF, DOCX, or TXT)')).toBeInTheDocument()
  })

  it('selects a file when dropped on the upload zone', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FileUpload />
      </NextIntlClientProvider>
    )

    const dropZone = screen
      .getByText('Drag and drop or click to upload CV (PDF, DOCX, or TXT)')
      .closest('label')
    const file = new File(['resume content'], 'resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    expect(dropZone).not.toBeNull()
    fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } })

    expect(screen.getByText('resume.docx')).toBeInTheDocument()
  })
})
