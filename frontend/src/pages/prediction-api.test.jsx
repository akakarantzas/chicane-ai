import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import Home from './Home'
import Predictions from './Predictions'

const predictionPayload = {
  race: 'Barcelona-Catalunya GP',
  circuit: 'Circuit de Barcelona-Catalunya',
  model_version: 'barcelona-catalunya-hgb-calibrated-1.0',
  status: 'Pre-Qualifying',
  predictions: [
    { driver: 'Antonelli', team: 'Mercedes', probability: 0.2704 },
    { driver: 'Norris', team: 'McLaren', probability: 0.2412 },
    { driver: 'Piastri', team: 'McLaren', probability: 0.225 },
    { driver: 'Russell', team: 'Mercedes', probability: 0.1489 },
    { driver: 'Verstappen', team: 'Red Bull Racing', probability: 0.0276 },
    { driver: 'Leclerc', team: 'Ferrari', probability: 0.0177 },
  ],
}

function mockPredictionFetch(payload = predictionPayload) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => payload,
  })
}

describe('prediction api rendering', () => {
  beforeEach(() => {
    mockPredictionFetch()
  })

  test('home renders latest predictions from the api', async () => {
    render(<Home onNavigate={vi.fn()} />)

    expect(await screen.findByText('Antonelli')).toBeInTheDocument()
    expect(screen.getByText('Norris')).toBeInTheDocument()
    expect(screen.getByText('Piastri')).toBeInTheDocument()
    expect(screen.getByText('Russell')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8000/api/predictions/next-race')
  })

  test('predictions page renders fetched race predictions', async () => {
    render(<Predictions onNavigate={vi.fn()} />)

    expect(await screen.findByText('Barcelona-Catalunya Grand Prix Predictions')).toBeInTheDocument()
    expect(screen.getByText('Circuit de Barcelona-Catalunya')).toBeInTheDocument()
    expect(screen.getByText('Antonelli')).toBeInTheDocument()
    expect(screen.getAllByText('Mercedes').length).toBeGreaterThan(0)
    expect(screen.getByText('Norris')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8000/api/predictions/next-race')
  })
})
