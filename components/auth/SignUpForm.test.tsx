import { describe, expect, it, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { SignUpForm } from './SignUpForm'

const signUp = vi.fn()
const push = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}))

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email, password, and confirm password inputs', () => {
    render(<SignUpForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /sign up/i })
    ).toBeInTheDocument()
  })

  it('shows an error for invalid email', async () => {
    const user = userEvent.setup()
    render(<SignUpForm />)

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('validates password length (min 8 characters)', async () => {
    const user = userEvent.setup()
    render(<SignUpForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'short')
    await user.type(screen.getByLabelText(/confirm password/i), 'short')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('validates passwords match', async () => {
    const user = userEvent.setup()
    render(<SignUpForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('shows error on failed signup', async () => {
    signUp.mockResolvedValue({ error: { message: 'User already exists' } })

    const user = userEvent.setup()
    render(<SignUpForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })

    expect(await screen.findByText(/User already exists/i)).toBeInTheDocument()
  })

  it('redirects on successful signup', async () => {
    signUp.mockResolvedValue({ data: { user: { id: '123' } }, error: null })

    const user = userEvent.setup()
    render(<SignUpForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })

    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('has a link to sign in page', () => {
    render(<SignUpForm />)

    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/auth/signin')
  })
})
