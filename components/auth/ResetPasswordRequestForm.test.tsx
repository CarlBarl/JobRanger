import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { ResetPasswordRequestForm } from './ResetPasswordRequestForm'

const resetPasswordForEmail = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail,
    },
  }),
}))

describe('ResetPasswordRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an error for invalid email', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordRequestForm />)

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('shows success state after requesting reset', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    const user = userEvent.setup()
    render(<ResetPasswordRequestForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows an error when reset fails', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Email provider is disabled' },
    })

    const user = userEvent.setup()
    render(<ResetPasswordRequestForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByText(/email provider is disabled/i)).toBeInTheDocument()
  })
})
