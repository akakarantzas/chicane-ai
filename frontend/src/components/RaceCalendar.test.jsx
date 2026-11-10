import { act, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { getRaceCalendar } from '../data/races'
import RaceCalendar from './RaceCalendar'

afterEach(() => { vi.useRealTimers() })

test('wheel scrolling pauses card snapping and restores it once the wheel is idle', () => {
  vi.useFakeTimers()
  const { container } = render(<RaceCalendar races={getRaceCalendar(new Date('2026-06-01'))} heading={<h2>Race Calendar</h2>} />)
  const scroller = container.querySelector('.home-calendar-scroll')

  act(() => { scroller.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true })) })
  expect(scroller.style.scrollSnapType).toBe('none')

  act(() => { vi.advanceTimersByTime(150) })
  expect(scroller.style.scrollSnapType).toBe('')
  expect(scroller.style.scrollBehavior).toBe('')
})
