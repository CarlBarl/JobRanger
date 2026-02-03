import { describe, expect, it, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { SignInForm } from './SignInForm'

const signInWithOtp = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp,
    },
  }),
}))

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email input and submit button', () => {
    render(<SignInForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send magic link/i })
    ).toBeInTheDocument()
  })

  it('shows an error for invalid email', async () => {
    const user = userEvent.setup()
    render(<SignInForm />)

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('shows success state after sending magic link', async () => {
    signInWithOtp.mockResolvedValue({ error: null })

    const user = userEvent.setup()
    render(<SignInForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send magic link/i }))

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })
})
