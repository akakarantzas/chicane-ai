import { apiUrl } from './api'

export async function fetchNextRacePrediction() {
  const response = await fetch(apiUrl('/api/predictions/next-race'))
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`)
  }
  return response.json()
}

export async function fetchPredictionHistory({ signal } = {}) {
  const response = await fetch(apiUrl('/api/predictions/history'), { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Server error: ${response.status}`)
  const data = await response.json()
  if (!Array.isArray(data.races)) throw new Error('Invalid prediction history response')
  return data
}
