import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { DocumentEditor } from './DocumentEditor'

const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockDocument = {
  id: 'doc-1',
  type: 'cv' as const,
  parsedContent: 'Test content',
  fileUrl: 'https://example.com/file.txt',
  createdAt: '2024-01-15',
}

describe('DocumentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders editor with document content', () => {
    render(<DocumentEditor document={mockDocument} />)

    expect(screen.getByRole('textbox')).toHaveValue('Test content')
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
  })

  it('enables save button when content changes', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    const saveButton = screen.getByRole('button', { name: /save/i })

    expect(saveButton).toBeDisabled()

    await user.clear(textarea)
    await user.type(textarea, 'New content')

    expect(saveButton).not.toBeDisabled()
  })

  it('updates preview when content changes', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Updated preview text')

    // Both editor and preview should have the content - find both elements
    const elements = screen.getAllByText('Updated preview text')
    expect(elements).toHaveLength(2) // textarea value and preview div
  })

  it('calls API and refreshes on save', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'New content')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedContent: 'New content' }),
      })
    })

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows unsaved changes indicator when dirty', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor document={mockDocument} />)

    expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument()

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Changed')

    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument()
  })

  it('does not refresh when save fails', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response)

    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'New content')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save document:',
        500,
        'Internal Server Error'
      )
    })

    expect(mockRefresh).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const networkError = new Error('Network failure')
    vi.mocked(global.fetch).mockRejectedValueOnce(networkError)

    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'New content')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Network error while saving document:',
        networkError
      )
    })

    expect(mockRefresh).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
