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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

function HamburgerButton({ onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        flexShrink: 0,
      }}
    >
      {[0, 1, 2].map((line) => (
        <span key={line} style={{ width: '20px', height: '2px', borderRadius: '2px', backgroundColor: '#F4F4F5', display: 'block' }} />
      ))}
    </button>
  )
}

function MobileNavDropdown({ onNavigate }) {
  return (
    <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <button onClick={() => onNavigate?.('predictions')} className="nav-link nav-link-active" style={{ width: '100%', textAlign: 'left', padding: '12px 4px' }}>Predictions</button>
      <button onClick={() => onNavigate?.('history')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => onNavigate?.('season')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Calendar</button>
    </div>
  )
}

function PredictionRow({ prediction, index, maxProb, isLast }) {
  const [isHovered, setIsHovered] = useState(false)
  const pct = (prediction.probability * 100).toFixed(1)
  const barWidth = `${(prediction.probability / maxProb) * 100}%`
  const isTop3 = index < 3

  return (
    <li
      className="prediction-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? '#222228' : '#1A1A1F',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
        borderLeft: isTop3 ? `3px solid ${ACCENT_BORDERS[index]}` : '3px solid transparent',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'background-color 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Position number */}
      <span style={{
        fontSize: '22px',
        fontWeight: 800,
        color: positionColor(index),
        width: '32px',
        textAlign: 'right',
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {index + 1}
      </span>

      {/* Driver info + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="prediction-row-main">
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#F4F4F5' }}>{prediction.driver}</div>
            <div style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '1px' }}>{prediction.team}</div>
          </div>
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#F4F4F5', fontVariantNumeric: 'tabular-nums', marginLeft: '12px', flexShrink: 0 }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: '10px', width: '100%', backgroundColor: '#27272A', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: barWidth,
            backgroundColor: barColor(index),
            borderRadius: '999px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </li>
  )
}

export default function Predictions({ onNavigate }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
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
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/f1pred.jpg)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.72) 0%, rgba(12,12,14,0.88) 50%, rgba(12,12,14,0.97) 100%)', zIndex: 0 }} />

      {/* Navbar */}
      <nav className="app-nav" style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
        <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px', gap: '16px' }}>
          <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
            <button onClick={() => onNavigate?.('home')} className="brand-button">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">Chicane.ai</span>
            </button>
          </div>
          <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
            <button onClick={() => onNavigate?.('predictions')} className="nav-link nav-link-active">Predictions</button>
            <button onClick={() => onNavigate?.('history')} className="nav-link">History</button>
            <button onClick={() => onNavigate?.('season')} className="nav-link">Calendar</button>
          </div>
          {isMobile && (
            <HamburgerButton
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            />
          )}
          <div className="nav-spacer flex-1" style={{ display: isMobile ? 'none' : 'block' }} />
        </div>
        {isMobile && isMenuOpen && <MobileNavDropdown onNavigate={onNavigate} />}
      </nav>

      <div className="page-shell max-w-2xl mx-auto px-6" style={{ paddingLeft: isMobile ? '16px' : '32px', paddingRight: isMobile ? '16px' : '32px', paddingTop: isMobile ? '40px' : '64px' }}>

        {/* Header */}
        <div className="mb-10">
          <h1 className="page-title">
            {race !== 'TBD' ? race : 'Next Race'} Winner Predictions
          </h1>
          {circuit !== 'TBD' && (
            <div className="prediction-subhead flex items-center gap-3 mt-2">
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
          {predictions.map((p, i) => (
            <PredictionRow
              key={p.driver}
              prediction={p}
              index={i}
              maxProb={maxProb}
              isLast={i === predictions.length - 1}
            />
          ))}
        </ol>

        {/* Footer note */}
        <p style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', fontStyle: 'italic', marginTop: '32px' }}>
          Predictions generated using Gradient Boosting model trained on 2022–2026 F1 data
        </p>

      </div>
    </div>
  )
}
