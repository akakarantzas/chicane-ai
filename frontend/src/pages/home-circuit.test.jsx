import { render } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import NextRaceCircuitCard from '../components/NextRaceCircuitCard'
import { circuits } from '../data/circuits'
import { getRaceCalendar, useRaceCalendar } from '../data/races'
import Home from './Home'

vi.mock('../components/NextRaceCircuitCard', () => ({ default: vi.fn(() => null) }))
vi.mock('../data/races', async (importOriginal) => ({
  ...await importOriginal(),
  useRaceCalendar: vi.fn(),
}))
vi.mock('../hooks/usePredictionFeed', () => ({
  default: () => ({
    loading: false,
    data: { race: 'Test GP', status: 'Unavailable', predictions: [] },
  }),
}))

test.each([
  ['2026-08-10', 'netherlands', true],
  ['2026-07-22', 'hungary', true],
  ['2026-07-10', 'belgium', true],
  ['2026-07-01', 'great-britain', true],
  ['2026-06-20', 'austria', true],
  ['2026-06-10', 'barcelona', true],
  ['2026-04-15', 'saudi-arabia', true],
  ['2026-04-01', 'bahrain', true],
  ['2026-03-20', 'japan', true],
  ['2026-03-10', 'china', true],
  ['2026-03-01', 'australia', true],
  ['2026-05-01', 'miami', false],
  ['2026-05-20', 'canada', false],
  ['2026-06-01', 'monaco', true],
  ['2026-09-20', 'azerbaijan', true],
  ['2026-10-01', 'singapore', true],
  ['2026-10-20', 'united-states', true],
])('selects the registered circuit for %s', (date, circuitId, overlay) => {
  vi.mocked(useRaceCalendar).mockReturnValue(getRaceCalendar(new Date(date)))
  vi.mocked(NextRaceCircuitCard).mockClear()
  render(<Home onNavigate={vi.fn()} />)

  const circuit = circuits[circuitId]
  expect(NextRaceCircuitCard.mock.lastCall[0]).toMatchObject({
    trackImage: circuit.image,
    circuitPath: circuit.path,
    viewBox: circuit.viewBox,
    imageVerticalTrim: circuit.imageVerticalTrim,
    animationDuration: circuit.duration,
    showTrackImage: overlay,
    showAnimatedPath: !overlay,
    alignOverlayWithTrackImage: overlay,
  })
})

test('Las Vegas does not inherit another US circuit animation', () => {
  vi.mocked(useRaceCalendar).mockReturnValue(getRaceCalendar(new Date('2026-11-20')))
  vi.mocked(NextRaceCircuitCard).mockClear()
  render(<Home onNavigate={vi.fn()} />)

  expect(NextRaceCircuitCard.mock.lastCall[0]).toMatchObject({
    raceName: 'Las Vegas Grand Prix',
    trackImage: undefined,
    circuitPath: undefined,
    showTrackImage: false,
  })
})
