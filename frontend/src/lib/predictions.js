import { apiUrl } from './api'

export async function fetchNextRacePrediction() {
  const response = await fetch(apiUrl('/api/predictions/next-race'))
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`)
  }
  return response.json()
}
