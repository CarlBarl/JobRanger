import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@/lib/test-utils'
import { JobSearch } from '@/components/jobs/JobSearch'

describe('JobSearch (guide)', () => {
  it('forces search tab when the dashboard guide is on the jobs segment', async () => {
    sessionStorage.setItem(
      'jobranger:jobsSearchState:v1',
      JSON.stringify({
        v: 1,
        tab: 'saved',
      })
    )
    sessionStorage.setItem(
      'jobranger:guide-flow',
      JSON.stringify({
        active: true,
        segment: 'jobs',
      })
    )

    render(<JobSearch />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Search Results' })).toHaveAttribute(
        'data-state',
        'active'
      )
    })
  })
})

