import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { JobActions } from './JobActions'

describe('JobActions', () => {
  it('renders localized action labels', () => {
    const messages = {
      jobs: {
        actions: {
          saved: 'Already saved',
          saving: 'Saving now...',
          saveJob: 'Save this job',
          generating: 'Generating now...',
          generateLetter: 'Generate a letter',
          generated: 'Generated: {id}',
          failedToSave: 'Could not save',
          failedToLoadDocuments: 'Could not load docs',
          uploadCvFirst: 'Upload CV first',
          failedToGenerate: 'Could not generate',
        },
      },
    }

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobActions afJobId="123" />
      </NextIntlClientProvider>
    )

    expect(screen.getByRole('button', { name: 'Save this job' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Generate a letter' })
    ).toBeInTheDocument()
  })
})
