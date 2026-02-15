import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { DashboardGuideController } from './DashboardGuideController'
import { START_DASHBOARD_GUIDE_EVENT } from '@/lib/guides/events'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DashboardGuideController', () => {
  it('shows welcome prompt on first dashboard visit and starts tour on accept', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          dashboardGuidePromptedAt: '2026-02-01T10:00:00.000Z',
          dashboardGuideCompletedAt: null,
          dashboardGuideDismissedAt: null,
        },
      })
    )
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    render(
      <DashboardGuideController
        initialState={{
          dashboardGuidePromptedAt: null,
          dashboardGuideCompletedAt: null,
          dashboardGuideDismissedAt: null,
        }}
      />
    )

    expect(screen.getByText('Welcome to your dashboard!')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Yes, show guide' }))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/user/guides',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'markDashboardPromptShown' }),
        })
      )
    })

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: START_DASHBOARD_GUIDE_EVENT,
      }))
    })
  })

  it('does not show first-visit prompt when already prompted', () => {
    render(
      <DashboardGuideController
        initialState={{
          dashboardGuidePromptedAt: '2026-02-01T10:00:00.000Z',
          dashboardGuideCompletedAt: null,
          dashboardGuideDismissedAt: null,
        }}
      />
    )

    expect(screen.queryByText('Welcome to your dashboard!')).not.toBeInTheDocument()
  })
})
