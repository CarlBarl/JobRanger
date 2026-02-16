import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@/lib/test-utils'
import {
  clearGuideFlowState,
  readGuideFlowState,
  writeGuideFlowState,
} from '@/lib/guides/flow'
import { JOBS_SEARCH_STATE_KEY } from '@/components/jobs/search/constants'
import { useGuideFlowState } from './useGuideFlowState'

describe('useGuideFlowState', () => {
  it('advances from job detail -> letters -> settings -> completed', async () => {
    clearGuideFlowState()

    writeGuideFlowState({ active: true, segment: 'job-detail', jobId: '123' })

    const onDismissed = vi.fn()
    const onCompleted = vi.fn()
    const onNavigateDashboard = vi.fn()
    const onNavigateJobs = vi.fn()
    const onNavigateLetters = vi.fn()
    const onNavigateSettings = vi.fn()

    const { result, rerender } = renderHook(
      ({ pathname }) =>
        useGuideFlowState({
          pathname,
          onNavigateDashboard,
          onNavigateJobs,
          onNavigateLetters,
          onNavigateSettings,
          onDismissed,
          onCompleted,
        }),
      { initialProps: { pathname: '/jobs/123' } }
    )

    await waitFor(() => {
      expect(result.current.activeSegment).toBe('job-detail')
      expect(result.current.tourOpen).toBe(true)
    })

    act(() => {
      result.current.handleGuideClose(true)
    })

    await waitFor(() => {
      expect(readGuideFlowState()?.segment).toBe('letters')
      expect(readGuideFlowState()?.jobId).toBe('123')
    })

    expect(onNavigateLetters).toHaveBeenCalledWith('123')

    rerender({ pathname: '/letters' })

    await waitFor(() => {
      expect(result.current.activeSegment).toBe('letters')
      expect(result.current.tourOpen).toBe(true)
    })

    act(() => {
      result.current.handleGuideClose(true)
    })

    await waitFor(() => {
      expect(readGuideFlowState()?.segment).toBe('settings')
      expect(readGuideFlowState()?.jobId).toBe('123')
    })

    expect(onNavigateSettings).toHaveBeenCalledTimes(1)

    rerender({ pathname: '/settings' })

    await waitFor(() => {
      expect(result.current.activeSegment).toBe('settings')
      expect(result.current.tourOpen).toBe(true)
    })

    act(() => {
      result.current.handleGuideClose(true)
    })

    await waitFor(() => {
      expect(readGuideFlowState()).toBeNull()
      expect(onCompleted).toHaveBeenCalledTimes(1)
      expect(onDismissed).not.toHaveBeenCalled()
    })
  })

  it('stores jobId when transitioning from jobs-await-detail on job detail path', async () => {
    clearGuideFlowState()
    writeGuideFlowState({ active: true, segment: 'jobs-await-detail' })

    const { result } = renderHook(() =>
      useGuideFlowState({
        pathname: '/jobs/999',
        onNavigateDashboard: () => {},
        onNavigateJobs: () => {},
        onNavigateLetters: () => {},
        onNavigateSettings: () => {},
        onDismissed: () => {},
        onCompleted: () => {},
      })
    )

    await waitFor(() => {
      expect(result.current.activeSegment).toBe('job-detail')
      expect(result.current.tourOpen).toBe(true)
    })

    const persisted = readGuideFlowState()
    expect(persisted?.segment).toBe('job-detail')
    expect(persisted?.jobId).toBe('999')
  })

  it('forces jobs guide to start on search tab even if saved tab was active', async () => {
    clearGuideFlowState()
    sessionStorage.setItem(JOBS_SEARCH_STATE_KEY, JSON.stringify({ v: 1, tab: 'saved', query: 'test' }))

    const onNavigateJobs = vi.fn()

    const { result } = renderHook(() =>
      useGuideFlowState({
        pathname: '/dashboard',
        onNavigateDashboard: () => {},
        onNavigateJobs,
        onNavigateLetters: () => {},
        onNavigateSettings: () => {},
        onDismissed: () => {},
        onCompleted: () => {},
      })
    )

    act(() => {
      result.current.startFullGuide()
    })

    await waitFor(() => {
      expect(result.current.activeSegment).toBe('dashboard')
      expect(result.current.tourOpen).toBe(true)
    })

    act(() => {
      result.current.handleGuideClose(true)
    })

    await waitFor(() => {
      expect(readGuideFlowState()?.segment).toBe('jobs')
      expect(onNavigateJobs).toHaveBeenCalledTimes(1)
    })

    const persistedJobsState = JSON.parse(sessionStorage.getItem(JOBS_SEARCH_STATE_KEY) ?? '{}') as {
      tab?: unknown
    }
    expect(persistedJobsState.tab).toBe('search')
  })
})
