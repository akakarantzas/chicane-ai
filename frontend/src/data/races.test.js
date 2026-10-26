import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { getRaceCalendar, useRaceCalendar } from './races'

afterEach(() => { vi.useRealTimers() })

test('the calendar keeps the same array until a race changes status', () => {
  vi.useFakeTimers()
  const races = getRaceCalendar(new Date('2026-01-01'))
  vi.setSystemTime(new Date(Date.parse(races[0].raceAt) - 60_000))
  const { result } = renderHook(() => useRaceCalendar(1000))
  const first = result.current

  act(() => { vi.advanceTimersByTime(5000) })
  expect(result.current).toBe(first)

  vi.setSystemTime(new Date(Date.parse(races[0].raceAt) + 1))
  act(() => { vi.advanceTimersByTime(1000) })
  expect(result.current).not.toBe(first)
})
