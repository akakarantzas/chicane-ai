import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { RecordingStatus, ScoreExplanation } from './H2HMonitoring'


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
