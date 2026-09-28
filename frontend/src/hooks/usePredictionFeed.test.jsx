import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import usePredictionFeed from './usePredictionFeed'

const before = { status: 'Pre-Qualifying', predictions: [{ driver: 'Russell', probability: .37 }] }
const after = { status: 'Post-Qualifying', predictions: [{ driver: 'Norris', probability: .45 }] }
const response = data => ({ ok: true, json: async () => data })

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

test('polls into post qualifying without a page reload, preserves identical data identity', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(before)).mockResolvedValueOnce(response(before)).mockResolvedValue(response(after))
  const { result } = renderHook(() => usePredictionFeed())
  await act(async () => {})
  const original = result.current.data
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(result.current.data).toBe(original)
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(result.current.data.status).toBe('Post-Qualifying')
  expect(result.current.data.predictions[0].driver).toBe('Norris')
})

test('keeps the previous forecast after refresh failure and recovers', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(before)).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(response(after))
  const { result } = renderHook(() => usePredictionFeed())
  await act(async () => {})
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(result.current.data).toEqual(before)
  expect(result.current.error).toBe('offline')
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(result.current.error).toBeNull()
  expect(result.current.data).toEqual(after)
})

test('aborts in-flight fetch and stops polling on unmount', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
  const { unmount } = renderHook(() => usePredictionFeed())
  const signal = fetch.mock.calls[0][1].signal
  unmount()
  expect(signal.aborted).toBe(true)
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000) })
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('invalid responses retain previous forecast', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(before)).mockResolvedValue(response({ predictions: [] }))
  const { result } = renderHook(() => usePredictionFeed())
  await act(async () => {})
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(result.current.data).toEqual(before)
  expect(result.current.error).toBe('Invalid prediction response')
})
