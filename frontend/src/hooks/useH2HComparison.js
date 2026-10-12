import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '../lib/api'

export default function useH2HComparison() {
  const [driver1, setDriver1] = useState('ANT')
  const [driver2, setDriver2] = useState('VER')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [predictionLoading, setPredictionLoading] = useState(false)
  const [predictionError, setPredictionError] = useState(null)
  const requestVersion = useRef(0)

  useEffect(() => () => {
    // Ignore late responses and skip follow-up requests after leaving the page.
    requestVersion.current += 1
  }, [])

  function resetSelection() {
    requestVersion.current += 1
    setResult(null)
    setPrediction(null)
    setPredictionError(null)
    setError(null)
    setLoading(false)
    setPredictionLoading(false)
  }

  async function compare() {
    const version = ++requestVersion.current
    setLoading(true)
    setPredictionLoading(true)
    setError(null)
    setPrediction(null)
    setPredictionError(null)
    let comparison
    try {
      const res = await fetch(apiUrl(`/api/h2h/compare?driver1=${driver1}&driver2=${driver2}&year=2026`))
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${res.status}`)
      }
      comparison = await res.json()
      if (version !== requestVersion.current) return
      setResult(comparison)
    } catch (err) {
      if (version === requestVersion.current) {
        setError(err.message)
        setLoading(false)
        setPredictionLoading(false)
      }
      return
    }
    setLoading(false)
    // Pin the prediction to the exact current-season comparison snapshot.
    try {
      const pin = comparison.freshness?.snapshot_id
      const res = await fetch(apiUrl(`/api/h2h/predict?driver1=${driver1}&driver2=${driver2}${pin ? `&snapshot_id=${encodeURIComponent(pin)}` : ''}`))
      if (!res.ok) {
        throw new Error(res.status === 409 ? 'The data snapshot changed. Compare again to use matching data.' : 'Prediction unavailable. You can compare again to retry.')
      }
      const data = await res.json()
      if (version === requestVersion.current) setPrediction(data)
    } catch (err) {
      if (version === requestVersion.current) setPredictionError(err.message)
    } finally {
      if (version === requestVersion.current) setPredictionLoading(false)
    }
  }

  function selectDriver1(value) {
    setDriver1(value)
    resetSelection()
  }

  function selectDriver2(value) {
    setDriver2(value)
    resetSelection()
  }

  return {
    driver1, driver2, selectDriver1, selectDriver2, compare,
    loading, error, result, prediction, predictionLoading, predictionError,
  }
}
