import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import H2H from './H2H'

async function compareWith(prediction) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
    ok: true,
    json: async () => url.includes('/predict?') ? prediction : { year: 2026, driver1: {}, driver2: {} },
  }))
  render(<H2H onNavigate={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }))
  await screen.findByText('2026 Season Overview')
}

test('finish-ahead card separates historical record from season overview', async () => {
  await compareWith({
    next_race: 'Test Grand Prix', prediction_status: 'available', predicted_winner: 'ANT',
    predicted_winner_full_name: 'Kimi Antonelli', confidence: 0.6,
    history_scope: { type: 'multi_season', years: [2025, 2026] },
    h2h_record: { driver1_wins: 4, driver2_wins: 2, total_races: 6, excluded_races: 1, tied_races: 0 },
  })
  expect(await screen.findByText('Test Grand Prix · Finish-ahead prediction')).toBeInTheDocument()
  expect(screen.getByText(/Which driver finishes ahead, regardless/)).toBeInTheDocument()
  expect(screen.getByText(/Historical head-to-head · 2025, 2026 · 6 scored/)).toBeInTheDocument()
  expect(screen.getByText(/Non-starts, disqualifications/)).toBeInTheDocument()
})

test.each([
  ['insufficient_data', 'Insufficient data'],
  ['no_clear_favorite', 'No clear favorite'],
])('%s does not display a winner or confidence percentage', async (prediction_status, label) => {
  await compareWith({ next_race: 'Test Grand Prix', prediction_status, predicted_winner: null, confidence: null })
  expect(await screen.findByText(label)).toBeInTheDocument()
  expect(screen.queryByText('Confidence')).not.toBeInTheDocument()
  expect(screen.queryByText('0%')).not.toBeInTheDocument()
})
