import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'

const signOut = vi.fn().mockResolvedValue({ error: null })
const push = vi.fn()
const refresh = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}))

import { SignOutButton } from './SignOutButton'

describe('SignOutButton', () => {
  it('signs out and redirects to sign-in', async () => {
    const user = userEvent.setup()
    render(<SignOutButton />)

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/auth/signin')
  })
})
