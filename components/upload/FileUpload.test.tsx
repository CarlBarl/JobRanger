import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { FileUpload } from './FileUpload'

describe('FileUpload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uploads file and calls onUploadComplete on success', async () => {
    const onUploadComplete = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { id: 'doc-1', fileUrl: 'x' } }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const user = userEvent.setup()
    render(<FileUpload onUploadComplete={onUploadComplete} />)

    const file = new File(['hi'], 'cv.txt', { type: 'text/plain' })
    await user.upload(screen.getByLabelText(/file upload/i), file)

    await user.click(screen.getByRole('button', { name: /upload/i }))

    expect(onUploadComplete).toHaveBeenCalledWith({ id: 'doc-1', fileUrl: 'x' })
  })

  it('shows error when upload fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'No file provided' },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    )

    const user = userEvent.setup()
    render(<FileUpload />)

    const file = new File(['hi'], 'cv.txt', { type: 'text/plain' })
    await user.upload(screen.getByLabelText(/file upload/i), file)
    await user.click(screen.getByRole('button', { name: /upload/i }))

    expect(await screen.findByText(/no file provided/i)).toBeInTheDocument()
  })
})

