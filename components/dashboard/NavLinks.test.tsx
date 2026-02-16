'use client'

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import { NavLinks } from '@/components/dashboard/NavLinks'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('NavLinks', () => {
  it('renders only dashboard and jobs links', () => {
    render(<NavLinks />)

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/jobs')
    expect(screen.queryByRole('link', { name: 'CV Studio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Letters' })).not.toBeInTheDocument()
  })
})
