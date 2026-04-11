import { useEffect, useState } from 'react'

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Red (#E8002D) for P1, fading through orange/yellow to a muted gray for last
function barColor(index, total) {
  const ratio = index / Math.max(total - 1, 1)
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
      <div className="min-h-screen bg-[#0C0C0E] text-[#F4F4F5] flex items-center justify-center">
        <p className="text-[#A1A1AA] animate-pulse" style={{ fontSize: '1.1rem' }}>Loading predictions…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0C0C0E] text-[#F4F4F5] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-400 font-medium" style={{ fontSize: '1.1rem' }}>Failed to load predictions</p>
          <p className="text-[#A1A1AA]" style={{ fontSize: '1rem' }}>{error}</p>
        </div>
      </div>
    )
  }

  const { race, circuit, predictions, status } = data
  const maxProb = predictions[0]?.probability ?? 1

  return (
    <div
      className="relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/f1pred.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: '#0C0C0E',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.72) 0%, rgba(12,12,14,0.88) 50%, rgba(12,12,14,0.97) 100%)', zIndex: 0 }} />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/[0.06] px-6" style={{ backgroundColor: 'transparent' }}>
        <div className="flex items-center h-16 max-w-7xl mx-auto">
          <div className="flex-1 flex items-center">
            <button onClick={() => onNavigate?.('home')} className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/logo-mark.png" alt="" style={{ height: '60px', width: '60px', objectFit: 'contain', marginRight: '-14px' }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.05em', fontSize: '1.9rem', color: '#F4F4F5' }}>Chicane.ai</span>
            </button>
          </div>
          <div className="flex items-center gap-8 text-[#A1A1AA]" style={{ fontSize: '1.2rem', fontWeight: 500 }}>
            <button onClick={() => onNavigate?.('predictions')} className="text-[#F4F4F5]">Predictions</button>
            <button onClick={() => onNavigate?.('history')} className="hover:text-[#F4F4F5] transition-colors">History</button>
            <button onClick={() => onNavigate?.('season')} className="hover:text-[#F4F4F5] transition-colors">Calendar</button>

          </div>
          <div className="flex-1" />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pb-12 w-full relative" style={{ zIndex: 1, paddingTop: '64px' }}>
        {/* Header */}
        <div className="mb-10">
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {race !== 'TBD' ? race : 'Next Race'} Winner Predictions
          </h1>
          {circuit !== 'TBD' && (
            <p className="text-[#A1A1AA] mt-1" style={{ fontSize: '1.1rem' }}>{circuit}</p>
          )}
        </div>

        {/* Prediction rows */}
        <ol className="space-y-4">
          {predictions.map((p, i) => {
            const pct = (p.probability * 100).toFixed(1)
            const barWidth = `${(p.probability / maxProb) * 100}%`
            const color = barColor(i, predictions.length)

            return (
              <li key={p.driver} className="flex items-center gap-4">
                {/* Position */}
                <span className="w-6 text-right font-semibold text-[#A1A1AA] shrink-0" style={{ fontSize: '1rem' }}>
                  {i + 1}
                </span>

                {/* Driver name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>{capitalize(p.driver)}</span>
                    <span className="tabular-nums text-[#A1A1AA]" style={{ fontSize: '1rem' }}>{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#27272A] rounded-full overflow-hidden">
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
