import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import History from './History'
import { fetchPredictionHistory } from '../lib/predictions'

vi.mock('../lib/predictions', () => ({ fetchPredictionHistory: vi.fn() }))

const race = {
  id: '2026:Race:16', race: 'Bahrain Grand Prix', circuit: 'Test Circuit',
  raceDate: '2026-10-04', date: 'October 4, 2026', actualWinner: 'Russell',
  predictions: [{ driver: 'Russell', team: 'Mercedes', probability: .6 }],
  actualResults: [{ fullName: 'George Russell', classification: '1', status: 'Finished' }],
  forecasts: [
    { id: 'post', status: 'Post-Qualifying', recordedAt: '2026-10-03T12:00:00Z',
      actualWinner: 'Russell', predictions: [{ driver: 'Russell', team: 'Mercedes', probability: .6 }] },
    { id: 'pre', status: 'Pre-Qualifying', recordedAt: '2026-10-02T12:00:00Z',
      actualWinner: 'Russell', predictions: [{ driver: 'Norris', team: 'McLaren', probability: .7 }] },
  ],
}

beforeEach(() => {
  fetchPredictionHistory.mockReset()
  fetchPredictionHistory.mockResolvedValue({ status: 'ready', races: [], pending_count: 0 })
})

afterEach(() => vi.useRealTimers())

test('new completed race appears before existing archives and every forecast update can be selected', async () => {
  fetchPredictionHistory.mockResolvedValue({ status: 'ready', races: [race], pending_count: 0 })
  render(<History onNavigate={vi.fn()} />)
  const heading = await screen.findByRole('heading', { name: 'Bahrain Grand Prix' })
  const card = within(heading.closest('section'))
  expect(screen.getAllByRole('heading', { level: 2 })[0]).toBe(heading)
  expect(card.getByText('Winner predicted')).toBeInTheDocument()
  expect(card.getByText('60.0%')).toBeInTheDocument()
  await userEvent.selectOptions(card.getByRole('combobox'), 'pre')
  expect(card.getByText('Model pick missed')).toBeInTheDocument()
  expect(card.getAllByText('Norris')).toHaveLength(2)
  expect(card.getByText('70.0%')).toBeInTheDocument()
  expect(card.getByText('Race classification (1 driver)')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Azerbaijan Grand Prix' })).toBeInTheDocument()
})

test('pending races remain outside the completed archive', async () => {
  fetchPredictionHistory.mockResolvedValue({ status: 'ready', races: [], pending_count: 1 })
  render(<History onNavigate={vi.fn()} />)
  expect(await screen.findByText('Awaiting published results for 1 race.')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Bahrain Grand Prix' })).not.toBeInTheDocument()
})

test('history polls for newly released results and stops after leaving the page', async () => {
  vi.useFakeTimers()
  vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(0)
  fetchPredictionHistory.mockResolvedValueOnce({ status: 'ready', races: [], pending_count: 1 })
    .mockResolvedValue({ status: 'ready', races: [race], pending_count: 0 })
  let view
  await act(async () => { view = render(<History onNavigate={vi.fn()} />) })
  expect(screen.queryByRole('heading', { name: 'Bahrain Grand Prix' })).not.toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(screen.getByRole('heading', { name: 'Bahrain Grand Prix' })).toBeInTheDocument()
  expect(fetchPredictionHistory).toHaveBeenCalledTimes(2)
  view.unmount()
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(fetchPredictionHistory).toHaveBeenCalledTimes(2)
})

test.each(['network', 'unavailable'])('%s refresh failures preserve previously fetched race cards', async (failure) => {
  vi.useFakeTimers()
  vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(0)
  fetchPredictionHistory.mockResolvedValueOnce({ status: 'ready', races: [race], pending_count: 0 })
  if (failure === 'network') fetchPredictionHistory.mockRejectedValue(new Error('offline'))
  else fetchPredictionHistory.mockResolvedValue({ status: 'unavailable', races: [], pending_count: 0 })
  await act(async () => { render(<History onNavigate={vi.fn()} />) })
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(screen.getByRole('heading', { name: 'Bahrain Grand Prix' })).toBeInTheDocument()
  expect(screen.getByText(/Latest history could not be refreshed/)).toBeInTheDocument()
})
