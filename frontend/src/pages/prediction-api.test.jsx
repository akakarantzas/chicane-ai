import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import Home from './Home'
import Predictions from './Predictions'

const predictionPayload = {
  race: 'Singapore GP',
  circuit: 'Marina Bay Street Circuit',
  model_version: 'singapore-hgb-calibrated-1.0',
  status: 'Pre-Qualifying',
  predictions: [
    { driver: 'Russell', team: 'Mercedes', probability: 0.3704 },
    { driver: 'Norris', team: 'McLaren', probability: 0.1313 },
    { driver: 'Leclerc', team: 'Ferrari', probability: 0.125 },
    { driver: 'Antonelli', team: 'Mercedes', probability: 0.0872 },
    { driver: 'Hamilton', team: 'Ferrari', probability: 0.0557 },
    { driver: 'Verstappen', team: 'Red Bull Racing', probability: 0.0381 },
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

    expect(await screen.findByText('Russell')).toBeInTheDocument()
    expect(screen.getByText('Norris')).toBeInTheDocument()
    expect(screen.getByText('Leclerc')).toBeInTheDocument()
    expect(screen.getByText('Antonelli')).toBeInTheDocument()
    expect(screen.getByText('Singapore predictions now live!')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8000/api/predictions/next-race', expect.objectContaining({ cache: 'no-store' }))
  })

  test('home does not announce a forecast for a finished race', async () => {
    mockPredictionFetch({ ...predictionPayload, status: 'Race finished' })
    render(<Home onNavigate={vi.fn()} />)

    expect(await screen.findByText('Russell')).toBeInTheDocument()
    expect(screen.getByText('Race finished')).toBeInTheDocument()
    expect(screen.queryByText(/predictions now live!/)).not.toBeInTheDocument()
  })

  test('predictions page does not promise a qualifying update for a finished race', async () => {
    mockPredictionFetch({ ...predictionPayload, automatic_update_enabled: true, status: 'Race finished' })
    render(<Predictions onNavigate={vi.fn()} />)

    expect(await screen.findByText('Race finished')).toBeInTheDocument()
    expect(screen.queryByText(/Automatically updates after qualifying/)).not.toBeInTheDocument()
  })

  test('predictions page explains the automatic update before qualifying', async () => {
    mockPredictionFetch({ ...predictionPayload, automatic_update_enabled: true })
    render(<Predictions onNavigate={vi.fn()} />)

    expect(await screen.findByText(/Automatically updates after qualifying/)).toBeInTheDocument()
  })

  test('predictions page renders fetched race predictions', async () => {
    render(<Predictions onNavigate={vi.fn()} />)

    expect(await screen.findByText('Singapore Grand Prix Predictions')).toBeInTheDocument()
    expect(screen.getByText('Marina Bay Street Circuit')).toBeInTheDocument()
    expect(screen.queryByText('Azerbaijan Grand Prix Predictions')).not.toBeInTheDocument()
    expect(screen.getByText('Antonelli')).toBeInTheDocument()
    expect(screen.getAllByText('Mercedes').length).toBeGreaterThan(0)
    expect(screen.getByText('Norris')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8000/api/predictions/next-race', expect.objectContaining({ cache: 'no-store' }))
  })
})
