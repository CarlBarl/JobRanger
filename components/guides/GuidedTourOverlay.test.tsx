import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { GuidedTourOverlay } from './GuidedTourOverlay'

describe('GuidedTourOverlay', () => {
  it('does not dismiss when clicking outside the tooltip, and shows a hint', async () => {
    const onClose = vi.fn()

    render(
      <div>
        <div data-guide-id="target" style={{ width: 10, height: 10 }} />
        <GuidedTourOverlay
          open
          steps={[
            {
              id: 's1',
              targetId: 'target',
              title: 'Title',
              description: 'Description',
            },
          ]}
          labels={{
            step: 'Step {current} of {total}',
            previous: 'Previous',
            next: 'Next',
            finish: 'Done',
            skip: 'Skip',
            outsideClickHint: 'Use Next or Skip to continue.',
            nextLockedHint: 'Generate a letter to continue.',
          }}
          onClose={onClose}
        />
      </div>
    )

    const user = userEvent.setup()
    await user.click(screen.getByTestId('guided-tour-backdrop'))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Use Next or Skip to continue.')).toBeInTheDocument()
  })

  it('disables next until the step requirement is met', async () => {
    const onClose = vi.fn()

    render(
      <div>
        <div data-guide-id="target" style={{ width: 10, height: 10 }} />
        <GuidedTourOverlay
          open
          steps={[
            {
              id: 's1',
              targetId: 'target',
              title: 'Title',
              description: 'Description',
              nextRequiresTargetId: 'req',
            },
          ]}
          labels={{
            step: 'Step {current} of {total}',
            previous: 'Previous',
            next: 'Next',
            finish: 'Done',
            skip: 'Skip',
            outsideClickHint: 'Use Next or Skip to continue.',
            nextLockedHint: 'Generate a letter to continue.',
          }}
          onClose={onClose}
        />
      </div>
    )

    const nextButton = screen.getByRole('button', { name: 'Done' })
    expect(nextButton).toBeDisabled()
    expect(screen.getByText('Generate a letter to continue.')).toBeInTheDocument()

    const required = document.createElement('div')
    required.setAttribute('data-guide-id', 'req')
    document.body.appendChild(required)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).not.toBeDisabled()
    })
  })
})
