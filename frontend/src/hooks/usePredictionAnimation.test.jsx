import { renderHook, waitFor } from '@testing-library/react'
import { expect, test } from 'vitest'

import { useAnimatedPercentage } from './usePredictionAnimation'

test('percentage animation waits for visibility and restarts when the prediction changes', async () => {
  const { result, rerender } = renderHook(
    ({ target, active }) => useAnimatedPercentage(target, { active, duration: 30 }),
    { initialProps: { target: 8, active: false } },
  )

  expect(result.current).toBe(0)
  rerender({ target: 8, active: true })
  await waitFor(() => expect(result.current).toBeCloseTo(8, 1))

  rerender({ target: 3, active: true })
  await waitFor(() => expect(result.current).toBeCloseTo(3, 1))
})
