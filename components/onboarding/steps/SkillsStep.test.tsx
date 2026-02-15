import { describe, expect, it, vi, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/lib/test-utils'
import { SkillsStep } from './SkillsStep'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SkillsStep', () => {
  it('extracts skills for the uploaded CV and allows continuing', async () => {
    const onComplete = vi.fn()
    const onExtractionDone = vi.fn()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/skills' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            success: true,
            data: { skills: ['React', 'TypeScript'] },
          })
        )
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(
      <SkillsStep
        documentId="doc-1"
        onComplete={onComplete}
        onExtractionDone={onExtractionDone}
      />
    )

    expect(await screen.findByText('React')).toBeInTheDocument()
    expect(onExtractionDone).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/skills',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ documentId: 'doc-1' }),
      })
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onComplete).toHaveBeenCalledWith(['React', 'TypeScript'])
  })
})

