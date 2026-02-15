import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
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
          generateSuccess: 'Generated successfully',
          viewLetters: 'View letters',
          generated: 'Generated: {id}',
          failedToSave: 'Could not save',
          failedToLoadDocuments: 'Could not load docs',
          uploadCvFirst: 'Upload CV first',
          failedToGenerate: 'Could not generate',
          guidanceLabel: 'Guidance',
          guidancePlaceholder: 'Write guidance',
          guidanceHelp: 'Optional tips',
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

  it('generates without guidance override when textarea is blank', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'cv-1', type: 'cv' }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: 'letter-1', content: 'Hello', createdAt: 'now' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    vi.stubGlobal('fetch', fetchMock)

    const messages = {
      jobs: {
        actions: {
          saved: 'Already saved',
          saving: 'Saving now...',
          saveJob: 'Save this job',
          generating: 'Generating now...',
          generateLetter: 'Generate a letter',
          generateSuccess: 'Generated successfully',
          viewLetters: 'View letters',
          generated: 'Generated: {id}',
          failedToSave: 'Could not save',
          failedToLoadDocuments: 'Could not load docs',
          uploadCvFirst: 'Upload CV first',
          failedToGenerate: 'Could not generate',
          guidanceLabel: 'Guidance',
          guidancePlaceholder: 'Write guidance',
          guidanceHelp: 'Optional tips',
        },
      },
    }

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobActions afJobId="123" />
      </NextIntlClientProvider>
    )

    await user.clear(screen.getByPlaceholderText('Write guidance'))
    await user.click(screen.getByRole('button', { name: 'Generate a letter' }))

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/documents')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/generate',
      expect.objectContaining({
        method: 'POST',
      })
    )

    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    expect(secondCallBody).toEqual({
      afJobId: '123',
      documentId: 'cv-1',
    })

    vi.unstubAllGlobals()
  })
})
