import { useEffect, useState } from 'react'

const BAR_COLORS = ['#E8002D', '#FF6B35', '#FFB800']
const ACCENT_BORDERS = ['#E8002D', '#FF6B35', '#FFB800']
const POSITION_COLORS = ['#E8002D', '#FF6B35', '#FFB800']

function positionColor(i) {
  return POSITION_COLORS[i] ?? '#A1A1AA'
}

function barColor(i) {
  return BAR_COLORS[i] ?? '#3F3F46'
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

  const { race, circuit, predictions } = data
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {race !== 'TBD' ? race : 'Next Race'} Winner Predictions
          </h1>
          {circuit !== 'TBD' && (
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[#A1A1AA]" style={{ fontSize: '1.1rem' }}>{circuit}</p>
              <span style={{
                backgroundColor: 'rgba(232,0,45,0.12)',
                color: '#E8002D',
                border: '1px solid rgba(232,0,45,0.25)',
                borderRadius: '999px',
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                Pre-qualifying
              </span>
            </div>
          )}
        </div>

        {/* Prediction rows */}
        <ol>
          {predictions.map((p, i) => {
            const pct = (p.probability * 100).toFixed(1)
            const barWidth = `${(p.probability / maxProb) * 100}%`
            const isTop3 = i < 3

            return (
              <li
                key={p.driver}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  minHeight: '64px',
                  padding: '24px',
                  borderLeft: isTop3 ? `3px solid ${ACCENT_BORDERS[i]}` : '3px solid transparent',
                  borderBottom: i < predictions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                {/* Position number */}
                <span style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: positionColor(i),
                  width: '32px',
                  textAlign: 'right',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {i + 1}
                </span>

                {/* Driver info + bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#F4F4F5' }}>{p.driver}</div>
                      <div style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '1px' }}>{p.team}</div>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#F4F4F5', fontVariantNumeric: 'tabular-nums', marginLeft: '12px', flexShrink: 0 }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: '10px', width: '100%', backgroundColor: '#27272A', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: barWidth,
                      backgroundColor: barColor(i),
                      borderRadius: '999px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {/* Footer note */}
        <p style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', fontStyle: 'italic', marginTop: '32px' }}>
          Predictions generated using Gradient Boosting model trained on 2022–2026 F1 data
        </p>

      </div>
    </div>
  )
}
