import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import H2H from './H2H'

async function compareWith(prediction, coverage, overview = {}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
    ok: true,
    json: async () => url.includes('/predict?') ? prediction : { year: 2026, driver1: {}, driver2: {}, coverage, ...overview },
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
  ['no_upcoming_race', 'No upcoming Grand Prix'],
  ['schedule_time_unknown', 'Race start time unconfirmed'],
])('%s does not display a winner or confidence percentage', async (prediction_status, label) => {
  await compareWith({ next_race: 'Test Grand Prix', prediction_status, predicted_winner: null, confidence: null })
  expect(await screen.findByText(label)).toBeInTheDocument()
  expect(screen.queryByText('Confidence')).not.toBeInTheDocument()
  expect(screen.queryByText('0%')).not.toBeInTheDocument()
})

test('missing race results are visible instead of implying a complete season', async () => {
  await compareWith(null, { missing_rounds: [5], missing_races: [{ race: 'Missing Grand Prix' }] })
  expect(await screen.findByText(/Results are incomplete. Missing races: Missing Grand Prix/)).toBeInTheDocument()
})

test('unavailable championship values display dashes, not zero or a fabricated rank', async () => {
  await compareWith(null, {}, {
    standings: { status: 'unavailable' },
    driver1: { points: null, champ_position: null, wins: 0 },
    driver2: { points: null, champ_position: null, wins: 0 },
  })
  const points = within(screen.getByRole('group', { name: 'Championship Points' }))
  expect(points.getAllByText('—')).toHaveLength(2)
  expect(points.queryByText('0')).not.toBeInTheDocument()
  expect(within(screen.getByRole('group', { name: 'GP Wins' })).getAllByText('0')).toHaveLength(2)
  expect(screen.getByText(/They are not estimated from race-only results/)).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'GP Result Entries' })).toBeInTheDocument()
  expect(screen.queryByText('Races Completed')).not.toBeInTheDocument()
})

test('championship snapshot and GP sample scopes are explicit', async () => {
  await compareWith(null, {}, {
    standings: { status: 'available', through_event: { race: 'Chinese Grand Prix', date: '2026-03-15' } },
    driver1: { abbreviation: 'ANT', points: 50, champ_position: 2, finish_sample_size: 2, championship_status: 'available' },
    driver2: { abbreviation: 'VER', points: 50, champ_position: 1, finish_sample_size: 1, championship_status: 'available' },
  })
  expect(screen.getByText(/through Chinese Grand Prix/)).toHaveTextContent('2026-03-15')
  expect(screen.getByText(/including sprint points and published adjustments/)).toBeInTheDocument()
  expect(screen.getByText(/Finish samples:/)).toHaveTextContent('ANT 2')
  expect(screen.getByText(/Finish samples:/)).toHaveTextContent('VER 1')
  expect(within(screen.getByRole('group', { name: 'Championship Points' })).getAllByText('50')).toHaveLength(2)
})

test('stale standings and incomplete finish samples are explained', async () => {
  await compareWith(null, {}, {
    standings: { status: 'stale' }, driver1: { stats_status: 'partial' },
  })
  expect(screen.getByText(/standings have not reached the latest due Grand Prix/)).toBeInTheDocument()
  expect(screen.getByText(/Some GP positions are missing/)).toBeInTheDocument()
})

test('unverified driver does not inherit another championship entry', async () => {
  await compareWith(null, {}, {
    standings: { status: 'available', through_event: { race: 'China' } },
    driver1: { championship_status: 'identity_conflict', points: null, champ_position: null },
    driver2: { championship_status: 'available', points: 0, champ_position: 20 },
  })
  expect(screen.getByText(/A selected driver could not be verified/)).toBeInTheDocument()
  const points = within(screen.getByRole('group', { name: 'Championship Points' }))
  expect(points.getByText('—')).toBeInTheDocument()
  expect(points.getByText('0')).toBeInTheDocument()
})

test('recent form shows the actual chronological windows and smaller samples', async () => {
  await compareWith({
    prediction_status: 'available', predicted_winner: 'ANT', predicted_winner_full_name: 'Kimi Antonelli',
    recent_form: {
      window_size: 3, used_in_score: true,
      driver1: { status: 'available', sample_size: 2, average_finish: 3, races: [
        { year: 2025, race: 'Abu Dhabi Grand Prix', date: '2025-12-07', position: 2 },
        { year: 2026, race: 'Australian Grand Prix', date: '2026-03-08', position: 4 },
      ] },
      driver2: { status: 'available', sample_size: 1, average_finish: 5, races: [
        { year: 2026, race: 'Australian Grand Prix', date: null, round: 1, position: 5 },
      ] },
    },
  })
  expect(screen.getByText('Recent form: last 3 eligible Grands Prix per driver')).toBeInTheDocument()
  expect(screen.getByText(/ANT: 2\/3 results/)).toHaveTextContent('Average finish 3')
  expect(screen.getByText(/VER: 1\/3 results/)).toHaveTextContent('Average finish 5')
  expect(screen.getByText(/2025 Abu Dhabi Grand Prix/)).toHaveTextContent(
    '2025 Abu Dhabi Grand Prix (2025-12-07) P2 → 2026 Australian Grand Prix (2026-03-08) P4',
  )
  expect(screen.getByText(/2026 Australian Grand Prix \(round 1\) P5/)).toBeInTheDocument()
  expect(screen.getByText(/Windows may include prior seasons/)).toBeInTheDocument()
})

test('unknown chronology is not displayed as an invented recent average', async () => {
  await compareWith({
    prediction_status: 'available', predicted_winner: 'ANT', predicted_winner_full_name: 'Kimi Antonelli',
    recent_form: {
      window_size: 3, used_in_score: false,
      driver1: { status: 'chronology_unavailable', sample_size: 0, average_finish: null, races: [] },
      driver2: { status: 'available', sample_size: 1, average_finish: 5, races: [] },
    },
  })
  expect(screen.getByText(/ANT: 0\/3 results/)).toHaveTextContent('Average finish —')
  expect(screen.getByText(/Recent form unavailable: race chronology could not be verified/)).toBeInTheDocument()
  expect(screen.getByText(/Recent form is not used in this score/)).toBeInTheDocument()
})

test('prediction request pins the exact comparison snapshot', async () => {
  await compareWith(null, {}, { freshness: { snapshot_id: 'snapshot-one', status: 'fresh' } })
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
    'http://localhost:8000/api/h2h/predict?driver1=ANT&driver2=VER&snapshot_id=snapshot-one',
  ))
})

test('stale snapshots show age, missing records and source disagreement warnings', async () => {
  await compareWith(null, { expected_rounds: [1, 2], loaded_rounds: [1], missing_rounds: [2] }, {
    freshness: { status: 'stale', partial: true, retrieved_at: '2026-09-25T00:00:00+00:00', age_seconds: 120,
      refresh_error: 'refresh_failed', retry_after_seconds: 30 },
    quality: { drivers: { ANT: { observed_rounds: [1], eligible_rounds: [1], no_result_rounds: [2] } },
      selected_source_counts: { jolpica: 1 }, conflicting_result_count: 1, code_only_identity_count: 0 },
  })
  expect(screen.getByText(/2026 comparison: Stale data/)).toHaveTextContent('Partial data')
  expect(screen.getByText(/Using an older snapshot/)).toBeInTheDocument()
  expect(screen.getByText(/Retrieved: 2026-09-25/)).toHaveTextContent('Age at lookup: 2 minutes')
  expect(screen.getByText(/ANT: 1 recorded rounds/)).toHaveTextContent('No recorded result in rounds: 2')
  expect(screen.getByText(/participation is not assumed/)).toBeInTheDocument()
  expect(screen.getByText(/Source disagreements: 1/)).toBeInTheDocument()
})

test('fresh retrieval does not claim complete or live source data', async () => {
  await compareWith(null, {}, { freshness: { status: 'fresh', partial: true } })
  expect(screen.getByText(/2026 comparison: Recently retrieved/)).toHaveTextContent('Partial data')
  expect(screen.getByText(/does not guarantee complete or live results/)).toBeInTheDocument()
})

test('historical snapshot failures are visible alongside an available prediction', async () => {
  await compareWith({ prediction_status: 'available', predicted_winner: 'ANT',
    predicted_winner_full_name: 'Kimi Antonelli', snapshots: {
      2024: { freshness: { status: 'unavailable' } },
      2025: { freshness: { status: 'stale', retrieved_at: '2026-09-24T00:00:00Z', age_seconds: 1000 } },
    },
  })
  expect(await screen.findByText('2024 history: Data unavailable')).toBeInTheDocument()
  expect(screen.getByText('2025 history: Stale data')).toBeInTheDocument()
})

test('expired snapshot prompts a new comparison without discarding season stats', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => url.includes('/predict?')
    ? { ok: false, status: 409 }
    : { ok: true, json: async () => ({ year: 2026, driver1: {}, driver2: {}, freshness: { snapshot_id: 'expired' } }) })
  render(<H2H onNavigate={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The data snapshot changed. Compare again')
  expect(screen.getByText('2026 Season Overview')).toBeInTheDocument()
  expect(screen.queryByText('Confidence')).not.toBeInTheDocument()
})

test('an older prediction response cannot overwrite a newer comparison', async () => {
  let finishOld
  let comparisons = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (url.includes('/compare?')) {
      comparisons += 1
      return { ok: true, json: async () => ({ year: 2026, driver1: {}, driver2: {},
        freshness: { snapshot_id: `pin-${comparisons}` } }) }
    }
    if (url.includes('pin-1')) return new Promise((resolve) => { finishOld = resolve })
    return { ok: true, json: async () => ({ prediction_status: 'available', predicted_winner: 'ANT', predicted_winner_full_name: 'Newer prediction' }) }
  })
  render(<H2H onNavigate={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }))
  await waitFor(() => expect(finishOld).toBeTypeOf('function'))
  fireEvent.click(screen.getByRole('button', { name: 'Compare' }))
  expect(await screen.findByText('Newer prediction')).toBeInTheDocument()
  await act(async () => finishOld({ ok: true, json: async () => ({ prediction_status: 'available', predicted_winner: 'VER', predicted_winner_full_name: 'Older prediction' }) }))
  expect(screen.queryByText('Older prediction')).not.toBeInTheDocument()
  expect(screen.getByText('Newer prediction')).toBeInTheDocument()
})
