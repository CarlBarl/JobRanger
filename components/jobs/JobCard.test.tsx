import { describe, expect, it } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import { JobCard } from './JobCard'

describe('JobCard', () => {
  it('renders headline and employer name', () => {
    render(
      <JobCard
        job={{
          id: '123',
          headline: 'Software Developer',
          employer: { name: 'ACME' },
          workplace_address: { municipality: 'Stockholm' },
        }}
      />
    )

    expect(screen.getByText('Software Developer')).toBeInTheDocument()
    expect(screen.getByText('ACME')).toBeInTheDocument()
    expect(screen.getByText(/Stockholm/)).toBeInTheDocument()
  })
})

