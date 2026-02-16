import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { JobActions } from './JobActions'

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
      viewLettersForJob: 'View letters for this job ({count})',
      generated: 'Generated: {id}',
      failedToSave: 'Could not save',
      failedToLoadDocuments: 'Could not load docs',
      uploadCvFirst: 'Upload CV first',
      failedToGenerate: 'Could not generate',
      guidanceLabel: 'Guidance',
      guidancePlaceholder: 'Write guidance',
      guidanceHelp: 'Optional tips',
      quotaExceededTitle: 'Monthly letter limit reached',
      quotaUsage: 'Used {used}/{limit} this month.',
      quotaResetAt: 'Resets on {date}.',
      quotaResetUnknown: 'next month',
      upgradeCta: 'Upgrade for more letters',
    },
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('JobActions', () => {
  it('renders localized action labels', () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('profile fetch unavailable'))
    vi.stubGlobal('fetch', fetchMock)

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

  it('shows job-specific letters link when letters already exist', () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('profile fetch unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobActions afJobId="123" existingLettersCount={2} />
      </NextIntlClientProvider>
    )

    const link = screen.getByRole('link', { name: 'View letters for this job (2)' })
    expect(link).toHaveAttribute('href', '/letters?jobId=123')
  })

  it('hides job-specific letters link when no letters exist yet', () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('profile fetch unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobActions afJobId="123" />
      </NextIntlClientProvider>
    )

    expect(screen.queryByRole('link', { name: /view letters for this job/i })).not.toBeInTheDocument()
  })

  it('generates without guidance override when textarea is blank', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              quotas: {
                generateLetter: {
                  limit: 1,
                  used: 0,
                  remaining: 1,
                  resetAt: '2026-03-01T00:00:00.000Z',
                  isExhausted: false,
                },
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
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

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobActions afJobId="123" />
      </NextIntlClientProvider>
    )

    await user.clear(screen.getByPlaceholderText('Write guidance'))
    await user.click(screen.getByRole('button', { name: 'Generate a letter' }))

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/user/profile')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/documents')
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/generate',
      expect.objectContaining({
        method: 'POST',
      })
    )

    const generateCallBody = JSON.parse(fetchMock.mock.calls[2][1].body as string)
    expect(generateCallBody).toEqual({
      afJobId: '123',
      documentId: 'cv-1',
    })

    expect(await screen.findByRole('link', { name: 'View letters for this job (1)' })).toHaveAttribute(
      'href',
      '/letters?jobId=123'
    )
  })

  it('disables generate and shows quota helper when monthly limit is exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            quotas: {
              generateLetter: {
                limit: 1,
                used: 1,
                remaining: 0,
                resetAt: '2026-03-01T00:00:00.000Z',
                isExhausted: true,
              },
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobActions afJobId="123" />
      </NextIntlClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate a letter' })).toBeDisabled()
    })

    expect(screen.getByText('Monthly letter limit reached')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Upgrade for more letters' })).toHaveAttribute(
      'href',
      '/pricing'
    )
  })

  it('switches to exhausted state when /api/generate returns QUOTA_EXCEEDED', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              quotas: {
                generateLetter: {
                  limit: 1,
                  used: 0,
                  remaining: 1,
                  resetAt: '2026-03-01T00:00:00.000Z',
                  isExhausted: false,
                },
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
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
            success: false,
            error: {
              code: 'QUOTA_EXCEEDED',
              limit: 1,
              used: 1,
              resetAt: '2026-03-01T00:00:00.000Z',
            },
          }),
          { status: 429, headers: { 'content-type': 'application/json' } }
        )
      )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobActions afJobId="123" />
      </NextIntlClientProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Generate a letter' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate a letter' })).toBeDisabled()
    })
    expect(screen.getByText('Monthly letter limit reached')).toBeInTheDocument()
    expect(screen.queryByText('Could not generate')).not.toBeInTheDocument()
  })
})
