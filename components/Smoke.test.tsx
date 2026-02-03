import { describe, expect, it } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import { Smoke } from '@/components/Smoke'

describe('Smoke', () => {
  it('renders', () => {
    render(<Smoke />)
    expect(screen.getByText('smoke')).toBeInTheDocument()
  })
})

