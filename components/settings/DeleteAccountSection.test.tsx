import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { DeleteAccountSection } from './DeleteAccountSection'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}))

const signOut = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: () => signOut(),
    },
  }),
}))

global.fetch = vi.fn()

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('blocks deletion when subscription is active', () => {
    render(<DeleteAccountSection hasActiveSubscription />)

    expect(screen.getByText('Subscription active')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage subscription' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled()
  })

  it('requires typing DELETE and calls the delete endpoint', async () => {
    const user = userEvent.setup()

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<DeleteAccountSection hasActiveSubscription={false} />)

    await user.click(screen.getByRole('button', { name: 'Delete account' }))

    expect(screen.getByText('Delete your account?')).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: 'Delete permanently' })
    expect(confirmButton).toBeDisabled()

    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE')
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)

    expect(global.fetch).toHaveBeenCalledWith('/api/account/delete', { method: 'DELETE' })

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/')
      expect(refresh).toHaveBeenCalled()
    })
  })
})

