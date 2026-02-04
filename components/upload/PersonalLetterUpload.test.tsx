import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { PersonalLetterUpload } from './PersonalLetterUpload'

const messages = {
  common: {
    error: 'An error occurred',
  },
  upload: {
    dropPersonalLetter: 'Click to upload Personal Letter',
    maxSize: 'Max 5MB',
    uploading: 'Uploading...',
    uploadPersonalLetter: 'Upload Personal Letter',
    invalidType: 'Invalid file type',
    tooLarge: 'File too large',
  },
}

describe('PersonalLetterUpload', () => {
  it('renders upload prompt', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PersonalLetterUpload />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('Click to upload Personal Letter')).toBeInTheDocument()
  })

  it('renders with card wrapper by default', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PersonalLetterUpload />
      </NextIntlClientProvider>
    )

    expect(container.querySelector('[class*="rounded-xl"]')).toBeInTheDocument()
  })

  it('renders without card wrapper when variant is embedded', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PersonalLetterUpload variant="embedded" />
      </NextIntlClientProvider>
    )

    expect(container.querySelector('[class*="rounded-xl"]')).not.toBeInTheDocument()
    expect(screen.getByText('Click to upload Personal Letter')).toBeInTheDocument()
  })
})
