import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import MonitoringPanel, { RecordingStatus, ScoreExplanation } from './H2HMonitoring'


test('explanation labels driver order, inputs and omitted evidence without probabilities', () => {
  render(<ScoreExplanation prediction={{ model_version: 'h2h-heuristic-v1', explanation: {
    driver_order: ['NOR', 'PIA'], description: 'Arithmetic, not probabilities.', components: [
      { feature: 'h2h', label: 'Shared head-to-head', basis: 'no_shared_races', weight: 0,
        driver1_input: 0, driver2_input: 0, driver1_contribution: 0, driver2_contribution: 0 },
      { feature: 'average_finish', label: 'Average finish', basis: 'available', weight: .5,
        driver1_input: 3, driver2_input: 6, driver1_contribution: .333333, driver2_contribution: .166667 },
    ],
  } }} />)
  const table = within(screen.getByRole('table', { hidden: true }))
  expect(table.getByText('NOR')).toBeInTheDocument()
  expect(table.getByText('PIA')).toBeInTheDocument()
  expect(table.getByText('Not used')).toBeInTheDocument()
  expect(table.getByText('Inputs: 3 / 6')).toBeInTheDocument()
  expect(table.getByText('0.333')).toBeInTheDocument()
  expect(screen.queryByText('33%')).not.toBeInTheDocument()
})

test('current comparison changes do not masquerade as an updated saved forecast', () => {
  render(<RecordingStatus monitoring={{ status: 'already_recorded', recorded_at: '2026-09-27T12:00:00Z', matches_current: false }} />)
  expect(screen.getByRole('status')).toHaveTextContent('monitoring keeps the original forecast')
  expect(screen.getByRole('status')).toHaveTextContent('2026-09-27T12:00:00Z')
})

test.each([['disabled', 'tracking is disabled'], ['unavailable', 'was not saved'], ['not_recorded', 'confirmed future race']])(
  'recording status %s is explicit', (status, text) => {
    render(<RecordingStatus monitoring={{ status }} />)
    expect(screen.getByRole('status')).toHaveTextContent(text)
  },
)

test('monitoring is read only and fetched only on demand', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ status: 'no_records', groups: [] }) })
  render(<MonitoringPanel />)
  expect(fetchMock).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Show prediction monitoring' }))
  expect(await screen.findByText(/No measured accuracy is available/)).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/h2h/monitoring')
  expect(screen.queryByText(/0\.0%/)).not.toBeInTheDocument()
})

test('monitoring separates pending, excluded and abstained forecasts from accuracy', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ status: 'available', groups: [{
    model_version: 'h2h-heuristic-v1', rule_version: 'finish-ahead-v1', policy_version: 'h2h-evidence-v1',
    overall: { logged_pairs: 4, pending_pairs: 1, excluded_pairs: 1, eligible_pairs: 2, accuracy: null,
      abstention_rate: .5, decision_coverage: 0 },
    scored_races: 0, race_macro_accuracy: null, result_revisions: 1, latest_outcome_at: null,
    trend: { status: 'insufficient_races' },
    races: [{ event_id: '2026:Race:1', date: '2026-03-08', race: 'Example GP',
      decided_pairs: 0, eligible_pairs: 2, pending_pairs: 1, excluded_pairs: 1, accuracy: null }],
  }] }) })
  render(<MonitoringPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Show prediction monitoring' }))
  expect(await screen.findByText(/Pending: 1 · Excluded: 1 · Eligible: 2/)).toBeInTheDocument()
  expect(screen.getByText(/Pair accuracy:/)).toHaveTextContent('Not yet measured')
  expect(screen.getByText(/Abstentions among logged forecasts:/)).toHaveTextContent('50.0%')
  expect(screen.getByText(/Performance trend needs at least 10/)).toBeInTheDocument()
  expect(screen.getByText(/self-selected and correlated/)).toBeInTheDocument()
  expect(screen.getByText('Results by race')).toBeInTheDocument()
  expect(screen.getByText('2026-03-08 · Example GP')).toBeInTheDocument()
})

test('monitoring failures allow retry and do not create fake results', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'disabled', groups: [] }) })
  render(<MonitoringPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Show prediction monitoring' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Monitoring unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Show prediction monitoring' }))
  expect(await screen.findByText('Prediction tracking is disabled on this server.')).toBeInTheDocument()
})
