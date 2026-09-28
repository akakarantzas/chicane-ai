import { useEffect, useState } from 'react'
import { fetchNextRacePrediction } from '../lib/predictions'

export default function usePredictionFeed() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer
    async function refresh() {
      try {
        const next = await fetchNextRacePrediction({ signal: controller.signal })
        if (controller.signal.aborted) return
        // Preserve identity (and animations) when nothing has changed.
        setData(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
        setError(null)
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          timer = window.setTimeout(refresh, 60_000)
        }
      }
    }
    refresh()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  return { data, loading, error }
}
