import { useEffect, useState } from 'react'

const BAR_COLORS = ['#E8002D', '#f97316', '#eab308']

function positionColor(i) {
  return BAR_COLORS[i] ?? '#A1A1AA'
}

function barColor(i) {
  return BAR_COLORS[i] ?? '#E8002D'
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
      <button onClick={() => onNavigate?.('h2h')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>H2H</button>
      <button onClick={() => onNavigate?.('history')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => onNavigate?.('season')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Calendar</button>
      <button onClick={() => onNavigate?.('contact')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Contact</button>
    </div>
  )
}

function PredictionRow({ prediction, index, maxProb, isLast }) {
  const [isHovered, setIsHovered] = useState(false)
  const pct = (prediction.probability * 100).toFixed(1)
  const barWidth = `${(prediction.probability / maxProb) * 100}%`
  const isTop3 = index < 3
  const rowDelay = `${index * 80}ms`
  const barDelay = `${index * 80 + 220}ms`

  return (
    <li
      className="prediction-row predictions-page-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? 'rgba(18,18,22,0.96)' : 'rgba(18,18,22,0.9)',
        transform: isHovered ? 'translateY(-1px)' : undefined,
        borderLeft: isTop3 ? '3px solid #E8002D' : '3px solid transparent',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.05)' : 'none',
        animationDelay: rowDelay,
      }}
    >
      {/* Position number */}
      <span className={`predictions-rank ${index < 3 ? 'predictions-rank-podium' : ''}`} style={{
        fontSize: '22px',
        fontWeight: 800,
        color: positionColor(index),
        width: '42px',
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
        '--rank-fill': positionColor(index),
      }}>
        {index + 1}
      </span>

      {/* Driver info + bar */}
      <div className="predictions-row-content">
        <div className="prediction-row-main">
          <div className="predictions-driver">
            <div className="predictions-driver-name">{prediction.driver}</div>
            <div className="predictions-team-name">{prediction.team}</div>
          </div>
          <div className="predictions-bar-track" style={{ height: '10px', width: '100%' }}>
            <div
              className="predictions-bar-fill"
              style={{
                height: '100%',
                width: '0%',
                '--bar-width': barWidth,
                '--bar-start': barColor(index),
                borderRadius: '999px',
                animationDelay: barDelay,
              }}
            />
          </div>
          <span className="predictions-percent">
            {pct}%
          </span>
        </div>
      </div>
    </li>
  )
}

export default function Predictions({ onNavigate, animationKey = 0 }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playAnimations, setPlayAnimations] = useState(false)

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

  useEffect(() => {
    if (!data) return undefined

    setPlayAnimations(false)
    let secondFrame
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setPlayAnimations(true)
      })
    })

    return () => {
      cancelAnimationFrame(firstFrame)
      if (secondFrame) cancelAnimationFrame(secondFrame)
    }
  }, [animationKey, data])

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
          <p style={{ fontSize: '1.1rem', color: '#E8002D', fontWeight: 500 }}>Failed to load predictions</p>
          <p className="text-[#A1A1AA]" style={{ fontSize: '1rem' }}>{error}</p>
        </div>
      </div>
    )
  }

  const { race, circuit, predictions } = data
  const raceTitle = race !== 'TBD' ? race.replace(/\bGP\b/g, 'Grand Prix') : 'Next Race'
  const maxProb = predictions[0]?.probability ?? 1

  return (
    <div
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/f1pred.jpg)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

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
            <button onClick={() => onNavigate?.('h2h')} className="nav-link">H2H</button>
            <button onClick={() => onNavigate?.('history')} className="nav-link">History</button>
            <button onClick={() => onNavigate?.('season')} className="nav-link">Calendar</button>
            <button onClick={() => onNavigate?.('contact')} className="nav-link">Contact</button>
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

      <div className="page-shell predictions-page-shell mx-auto px-6" style={{ paddingLeft: isMobile ? '16px' : '32px', paddingRight: isMobile ? '16px' : '32px', paddingTop: isMobile ? '40px' : '64px' }}>

        {/* Header */}
        <div className="predictions-page-header">
          <h1 className="page-title">
            {raceTitle} Predictions
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
        <section className="predictions-page-card">
          <div className="predictions-card-header">
            <div>
              <span className="predictions-card-eyebrow">Latest Predictions</span>
              <p>AI powered F1 predictions updated before every race session.</p>
            </div>
          </div>

          <div className="predictions-column-head">
            <span>Rank</span>
            <span>Driver</span>
            <span>Win Probability</span>
            <span>Prediction</span>
          </div>

          <ol
            className={`predictions-page-list ${playAnimations ? 'predictions-animate-in' : 'predictions-animation-reset'}`}
            key={`predictions-list-${animationKey}`}
          >
            {predictions.map((p, i) => (
              <PredictionRow
                key={`${animationKey}-${p.driver}`}
                prediction={p}
                index={i}
                maxProb={maxProb}
                isLast={i === predictions.length - 1}
              />
            ))}
          </ol>
        </section>

        {/* Footer note */}
        <p style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', fontStyle: 'italic', marginTop: '32px' }}>
          Predictions generated using Gradient Boosting model trained on 2022–2026 F1 data
        </p>

      </div>
    </div>
  )
}
