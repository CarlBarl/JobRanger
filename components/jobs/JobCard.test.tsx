import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { JobCard } from './JobCard'

describe('JobCard', () => {
  it('renders headline and employer name', () => {
    const messages = {
      jobs: {
        card: {
          published: 'Published on',
          deadline: 'Apply by',
          viewListing: 'See listing',
          unknownEmployer: 'Unknown employer',
          untitledRole: 'Untitled role',
        },
      },
    }

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <JobCard
          job={{
            id: '123',
            headline: 'Software Developer',
            employer: { name: 'ACME' },
            workplace_address: {
              municipality: 'Stockholm',
              region: 'Stockholms län',
              country: 'Sverige',
            },
            logo_url: 'https://example.com/logo.png',
            webpage_url: 'https://example.com/jobs/123',
            publication_date: '2026-02-03T13:32:06',
            application_deadline: '2026-02-28T23:59:59',
            employment_type: { label: 'Vanlig anställning' },
            working_hours_type: { label: 'Heltid' },
            occupation: { label: 'Systemutvecklare' },
          }}
        />
      </NextIntlClientProvider>
    )

    expect(screen.getByText('Software Developer')).toBeInTheDocument()
    expect(screen.getByText('ACME')).toBeInTheDocument()
    expect(
      screen.getByText('Stockholm, Stockholms län, Sverige')
    ).toBeInTheDocument()
    expect(screen.getByText('Systemutvecklare')).toBeInTheDocument()
    expect(screen.getByText(/Vanlig anställning/)).toBeInTheDocument()
    expect(screen.getByText(/Heltid/)).toBeInTheDocument()
    expect(screen.getByText('2026-02-03')).toBeInTheDocument()
    expect(screen.getByText(/2026-02-28/)).toBeInTheDocument()
    expect(screen.getByAltText('ACME logo')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /see listing/i })
    ).toHaveAttribute('href', 'https://example.com/jobs/123')
  })
})
