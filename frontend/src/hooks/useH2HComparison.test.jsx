import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import useH2HComparison from './useH2HComparison'

test('a failed comparison stops prediction loading and can be retried', async () => {
  const comparison = { year: 2026, freshness: { snapshot_id: 'retry-snapshot' } }
  const prediction = { prediction_status: 'insufficient_data' }
  const fetch = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({ detail: 'Results unavailable.' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => comparison })
    .mockResolvedValueOnce({ ok: true, json: async () => prediction })
  const { result } = renderHook(() => useH2HComparison())

  await act(async () => { await result.current.compare() })
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(result.current.error).toBe('Results unavailable.')
  expect(result.current.loading).toBe(false)
  expect(result.current.predictionLoading).toBe(false)

  await act(async () => { await result.current.compare() })
  expect(result.current.error).toBeNull()
  expect(result.current.result).toEqual(comparison)
  expect(result.current.prediction).toEqual(prediction)
  expect(result.current.predictionLoading).toBe(false)
})

test('leaving the page during a comparison does not start a prediction request', async () => {
  let finishComparison
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise((resolve) => {
    finishComparison = resolve
  }))
  const { result, unmount } = renderHook(() => useH2HComparison())
  let pending
  act(() => { pending = result.current.compare() })
  unmount()

  await act(async () => {
    finishComparison({ ok: true, json: async () => ({ year: 2026 }) })
    await pending
  })
  expect(fetch).toHaveBeenCalledTimes(1)
})
