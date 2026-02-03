import { describe, expect, it, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { SignInForm } from './SignInForm'

const signInWithOtp = vi.fn()
const push = vi.fn()
const refresh = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}))

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Magic Link Tab', () => {
    it('renders tabs and email input', () => {
      render(<SignInForm />)

      expect(screen.getByRole('tab', { name: /magic link/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /password/i })).toBeInTheDocument()
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

  describe('Password Tab', () => {
    it('shows password input when password tab is selected', async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.click(screen.getByRole('tab', { name: /password/i }))

      // Use the id to select the password input specifically
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(document.getElementById('password')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /^sign in$/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
        'href',
        '/auth/forgot'
      )
    })

    it('shows an error for invalid email', async () => {
      const user = userEvent.setup()
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      render(<SignInForm />)

      await user.click(screen.getByRole('tab', { name: /password/i }))
      const passwordInput = document.getElementById('password') as HTMLInputElement
      await user.type(screen.getAllByLabelText(/email/i)[0], 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('shows error on invalid credentials', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Invalid login credentials' },
          }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        )
      )

      const user = userEvent.setup()
      render(<SignInForm />)

      await user.click(screen.getByRole('tab', { name: /password/i }))
      const passwordInput = document.getElementById('password') as HTMLInputElement
      await user.type(screen.getAllByLabelText(/email/i)[0], 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
      })

      expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
    })

    it('redirects on successful password sign in', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )

      const user = userEvent.setup()
      render(<SignInForm />)

      await user.click(screen.getByRole('tab', { name: /password/i }))
      const passwordInput = document.getElementById('password') as HTMLInputElement
      await user.type(screen.getAllByLabelText(/email/i)[0], 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByRole('button', { name: /^sign in$/i }))

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })

      expect(push).toHaveBeenCalledWith('/dashboard')
      expect(refresh).toHaveBeenCalled()
    })
  })

  it('has a link to sign up page', () => {
    render(<SignInForm />)

    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toHaveAttribute('href', '/auth/signup')
  })
})
