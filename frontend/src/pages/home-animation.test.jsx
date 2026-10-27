import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import usePredictionFeed from '../hooks/usePredictionFeed'
import Home from './Home'

vi.mock('../hooks/usePredictionFeed', () => ({ default: vi.fn() }))

const feed = (probability) => ({
  data: {
    race: 'Singapore GP',
    status: 'Pre-Qualifying',
    predictions: [
      { driver: 'Russell', team: 'Mercedes', probability: 0.37 },
      { driver: 'Norris', team: 'McLaren', probability: 0.13 },
      { driver: 'Leclerc', team: 'Ferrari', probability: 0.12 },
      { driver: 'Antonelli', team: 'Mercedes', probability },
    ],
  },
  loading: false,
})

test('home ghost prediction animates to the refreshed probability', async () => {
  vi.mocked(usePredictionFeed).mockReturnValue(feed(0.0872))
  const props = { onNavigate: vi.fn() }
  const { rerender } = render(<Home {...props} />)

  expect(await screen.findByText('8.7%', {}, { timeout: 5000 })).toBeInTheDocument()

  vi.mocked(usePredictionFeed).mockReturnValue(feed(0.054))
  rerender(<Home {...props} />)

  expect(await screen.findByText('5.4%', {}, { timeout: 5000 })).toBeInTheDocument()
}, 15_000) // two real animations take ~4s, so the 5s default flakes under load
