import { useEffect, useState } from 'react'

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Red (#ef4444) for P1, fading through orange/yellow to a muted gray for last
function barColor(index, total) {
  const ratio = index / Math.max(total - 1, 1)
  // interpolate hue: 0 (red) → 30 (orange) → 50 (yellow), saturation and lightness drop off
  const hue = Math.round(ratio * 50)
  const sat = Math.round(90 - ratio * 55)
  const light = Math.round(50 - ratio * 20)
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

export default function Predictions({ onNavigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/predictions/next-race')
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 text-lg tracking-wide animate-pulse">Loading predictions…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-400 text-lg font-medium">Failed to load predictions</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const { race, circuit, predictions, status } = data
  const maxProb = predictions[0]?.probability ?? 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => onNavigate?.('home')}
            className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-1 hover:text-gray-300 transition-colors"
          >
            ← Chicane.ai
          </button>
          <h1 className="text-3xl font-bold tracking-tight">
            {race !== 'TBD' ? race : 'Next Race'} Predictions
          </h1>
          {circuit !== 'TBD' && (
            <p className="text-gray-400 mt-1">{circuit}</p>
          )}
          <span
            className={`inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-full ${
              status === 'ok'
                ? 'bg-green-900/50 text-green-400'
                : 'bg-yellow-900/50 text-yellow-400'
            }`}
          >
            {status}
          </span>
        </div>

        {/* Prediction rows */}
        <ol className="space-y-3">
          {predictions.map((p, i) => {
            const pct = (p.probability * 100).toFixed(1)
            const barWidth = `${(p.probability / maxProb) * 100}%`
            const color = barColor(i, predictions.length)

            return (
              <li key={p.driver} className="flex items-center gap-4">
                {/* Position */}
                <span className="w-6 text-right text-sm font-semibold text-gray-500 shrink-0">
                  {i + 1}
                </span>

                {/* Driver name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{capitalize(p.driver)}</span>
                    <span className="text-sm tabular-nums text-gray-400">{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: barWidth, backgroundColor: color }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
