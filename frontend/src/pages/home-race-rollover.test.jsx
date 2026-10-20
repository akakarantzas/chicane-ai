import { act, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { circuits } from '../data/circuits'
import { getRaceCalendar } from '../data/races'
import Home from './Home'

vi.mock('../hooks/usePredictionFeed', () => ({
  default: () => ({
    loading: false,
    data: { race: 'Australian GP', status: 'Post-Qualifying', predictions: [] },
  }),
}))

afterEach(() => { vi.useRealTimers() })

test('the mounted card advances through all 23 race boundaries with matching details and animation', () => {
  vi.useFakeTimers()
  // Drive calendar time independently of SVG playback, which jsdom cannot render.
  let frame = 0
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => ++frame)
  const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
  const races = getRaceCalendar(new Date('2026-01-01'))
  vi.setSystemTime(new Date(Date.parse(races[0].raceAt) - 500))
  render(<Home onNavigate={vi.fn()} />)

  const assertCard = (race) => {
    const card = screen.getByRole('article', { name: 'Next race' })
    const name = race.name.replace(/\bGP\b/g, 'Grand Prix')
    const circuit = circuits[race.circuitId]
    expect(within(card).getByRole('heading', { name })).toBeInTheDocument()
    expect(card).toHaveTextContent(`Round ${race.round} · 2026 Season`)
    expect(card).toHaveTextContent(`${race.venue ?? circuit.name} · ${race.date}, 2026`)
    expect(card).toHaveTextContent(`${race.city ?? race.country} · ${race.code}`)
    const image = within(card).getByAltText(`${name} Circuit`)
    expect(image).toHaveAttribute('src', circuit.image)
    const svg = within(card).getByRole('img', { name: `Animated ${name} circuit marker` })
    expect(svg).toHaveAttribute('viewBox', circuit.viewBox)
    expect(svg.querySelector('path[stroke="transparent"]')).toHaveAttribute('d', circuit.path)
    return { card, image, svg }
  }

  let previous = assertCard(races[0])
  expect(within(previous.card).getByText('Post-Qualifying')).toBeInTheDocument()
  for (let i = 1; i < races.length; i++) {
    const previousFrame = frame
    vi.setSystemTime(new Date(Date.parse(races[i - 1].raceAt) + 1))
    act(() => { vi.advanceTimersByTime(1000) })
    const current = assertCard(races[i])
    expect(previous.image.isConnected).toBe(false)
    expect(previous.svg.isConnected).toBe(false)
    expect(cancelFrame).toHaveBeenCalledWith(previousFrame)
    expect(current.card).toHaveTextContent('Predictions pending')
    expect(within(current.card).queryByText('Post-Qualifying')).not.toBeInTheDocument()
    previous = current
  }
})
