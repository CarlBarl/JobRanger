import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { SearchStatusBar } from './SearchStatusBar'

const messages = {
  jobs: {
    searchStatus: {
      searching: 'Searching for jobs...',
      searchingFound: 'Found {count} jobs so far...',
      complete: 'Found {count} jobs matching your search',
      completeWithFailures: 'Found {count} jobs ({failed} search failed)',
      noResults: 'No jobs found matching your search',
    },
  },
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('SearchStatusBar', () => {
  it('returns null when phase is idle', () => {
    const { container } = renderWithIntl(
      <SearchStatusBar phase="idle" totalFound={0} failedQueries={0} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows "Searching for jobs..." when searching with 0 results', () => {
    renderWithIntl(
      <SearchStatusBar phase="searching" totalFound={0} failedQueries={0} />
    )
    expect(screen.getByText('Searching for jobs...')).toBeInTheDocument()
  })

  it('shows "Found 87 jobs so far..." when searching with results', () => {
    renderWithIntl(
      <SearchStatusBar phase="searching" totalFound={87} failedQueries={0} />
    )
    expect(screen.getByText('Found 87 jobs so far...')).toBeInTheDocument()
  })

  it('shows "Found 423 jobs matching your search" when complete', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={423} failedQueries={0} />
    )
    expect(
      screen.getByText('Found 423 jobs matching your search')
    ).toBeInTheDocument()
  })

  it('shows "Found 342 jobs (1 search failed)" when complete with failures', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={342} failedQueries={1} />
    )
    expect(
      screen.getByText('Found 342 jobs (1 search failed)')
    ).toBeInTheDocument()
  })

  it('shows "No jobs found" when complete with 0 results', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={0} failedQueries={0} />
    )
    expect(
      screen.getByText('No jobs found matching your search')
    ).toBeInTheDocument()
  })

  it('shows spinner when searching', () => {
    renderWithIntl(
      <SearchStatusBar phase="searching" totalFound={0} failedQueries={0} />
    )
    expect(screen.getByTestId('search-status-spinner')).toBeInTheDocument()
  })

  it('does not show spinner when complete', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={10} failedQueries={0} />
    )
    expect(screen.queryByTestId('search-status-spinner')).not.toBeInTheDocument()
  })
})
