import { render, screen, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { circuits } from '../data/circuits'
import { getRaceCalendar, useRaceCalendar } from '../data/races'
import usePredictionFeed from '../hooks/usePredictionFeed'
import Home from './Home'

vi.mock('../data/races', async (importOriginal) => ({
  ...await importOriginal(),
  useRaceCalendar: vi.fn(),
}))
vi.mock('../hooks/usePredictionFeed', () => ({ default: vi.fn() }))

beforeEach(() => {
  vi.mocked(usePredictionFeed).mockReturnValue({
    loading: false,
    data: { race: 'Test GP', status: 'Post-Qualifying', predictions: [] },
  })
})

test('every scheduled race has a registered circuit animation', () => {
  const races = getRaceCalendar(new Date('2026-01-01'))
  expect(races).toHaveLength(24)
  for (const race of races) {
    expect(circuits[race.circuitId], race.name).toMatchObject({
      id: race.circuitId,
      image: expect.any(String),
      path: expect.any(String),
      viewBox: expect.any(String),
      duration: 4300,
    })
  }
})

test.each([
  ['2026-12-01', 'abu-dhabi', true],
  ['2026-11-25', 'qatar', true],
  ['2026-11-20', 'las-vegas', true],
  ['2026-11-04', 'brazil', true],
  ['2026-10-28', 'mexico', true],
  ['2026-09-10', 'spain', true],
  ['2026-09-01', 'italy', true],
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
  render(<Home onNavigate={vi.fn()} />)

  const race = getRaceCalendar(new Date(date)).find((entry) => entry.status === 'current')
  const circuit = circuits[circuitId]
  expect(race.circuitId).toBe(circuitId)
  const card = screen.getByRole('article', { name: 'Next race' })
  const raceName = race.name.replace(/\bGP\b/g, 'Grand Prix')
  expect(within(card).getByRole('heading', { name: raceName })).toBeInTheDocument()
  expect(card).toHaveTextContent(`Round ${race.round} · 2026 Season`)
  expect(card).toHaveTextContent(`${race.venue ?? circuit.name} · ${race.date}, 2026`)
  expect(card).toHaveTextContent(`${race.city ?? race.country} · ${race.code}`)
  const image = within(card).getByAltText(`${raceName} Circuit`)
  expect(image).toHaveAttribute('src', circuit.image)
  expect(image.classList.contains('circuit-base-image-visible')).toBe(overlay)
  const svg = within(card).getByRole('img', { name: `Animated ${raceName} circuit marker` })
  expect(svg).toHaveAttribute('viewBox', circuit.viewBox)
  expect(svg).toHaveAttribute('preserveAspectRatio', overlay ? 'xMidYMid meet' : 'none')
  expect(svg.querySelector('path[stroke="transparent"]')).toHaveAttribute('d', circuit.path)
  expect(svg.querySelector('path[stroke="red"]')).toBeNull()
})

test('Las Vegas uses its own circuit despite sharing the US country code', () => {
  vi.mocked(useRaceCalendar).mockReturnValue(getRaceCalendar(new Date('2026-11-20')))
  render(<Home onNavigate={vi.fn()} />)

  const card = screen.getByRole('article', { name: 'Next race' })
  expect(within(card).getByAltText('Las Vegas Grand Prix Circuit'))
    .toHaveAttribute('src', circuits['las-vegas'].image)
  expect(card.querySelector('path[stroke="transparent"]'))
    .toHaveAttribute('d', circuits['las-vegas'].path)
  expect(circuits['las-vegas'].path).not.toBe(circuits['united-states'].path)
  expect(circuits['las-vegas'].path).not.toBe(circuits.miami.path)
})

test('a stale prediction status is hidden until the feed matches the card race', () => {
  vi.mocked(useRaceCalendar).mockReturnValue(getRaceCalendar(new Date('2026-10-20')))
  vi.mocked(usePredictionFeed).mockReturnValue({
    loading: false,
    data: { race: 'Singapore GP', status: 'Post-Qualifying', predictions: [] },
  })
  const { rerender } = render(<Home onNavigate={vi.fn()} />)
  const card = screen.getByRole('article', { name: 'Next race' })
  expect(card).toHaveTextContent('Predictions pending')
  expect(within(card).queryByText('Post-Qualifying')).not.toBeInTheDocument()

  vi.mocked(usePredictionFeed).mockReturnValue({
    loading: false,
    data: { race: 'United States Grand Prix', status: 'Pre-Qualifying', predictions: [] },
  })
  rerender(<Home onNavigate={vi.fn()} />)
  expect(within(card).getByText('Pre-Qualifying')).toBeInTheDocument()
  expect(within(card).queryByText('Predictions pending')).not.toBeInTheDocument()
  expect(within(card).getByAltText('United States Grand Prix Circuit'))
    .toHaveAttribute('src', circuits['united-states'].image)
})
