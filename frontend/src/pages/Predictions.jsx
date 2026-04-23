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

function PredictionRow({ prediction, index, maxProb, isLast, isExtra = false, extraIndex = 0 }) {
  const [isHovered, setIsHovered] = useState(false)
  const pctValue = prediction.probability * 100
  const [displayPct, setDisplayPct] = useState(0)
  const barWidth = `${pctValue}%`
  const isTop3 = index < 3
  const rowDelay = isExtra ? `${extraIndex * 55}ms` : `${index * 55}ms`
  const barDelayMs = index * 55 + 180
  const barDelay = `${barDelayMs}ms`

  useEffect(() => {
    setDisplayPct(0)

    const duration = 2880
    let frameId
    let timeoutId

    const startAnimation = () => {
      const start = performance.now()

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayPct(pctValue * eased)

        if (progress < 1) {
          frameId = requestAnimationFrame(tick)
        }
      }

      frameId = requestAnimationFrame(tick)
    }

    timeoutId = window.setTimeout(startAnimation, barDelayMs)

    return () => {
      window.clearTimeout(timeoutId)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [barDelayMs, pctValue])

  return (
    <li
      className={`prediction-row predictions-page-row ${isExtra ? 'predictions-extra-row' : ''}`}
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
      <span className={`predictions-rank num ${index < 3 ? 'predictions-rank-podium' : ''}`} style={{
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
          <span className="predictions-percent num">
            {displayPct.toFixed(1)}%
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
  const [showAllPredictions, setShowAllPredictions] = useState(false)

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
  const visiblePredictions = showAllPredictions ? predictions : predictions.slice(0, 5)
  const hiddenCount = Math.max(predictions.length - 5, 0)

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
              <span className="brand-wordmark">ChicaneAI</span>
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
              <span className="next-race-pill-primary" style={{
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                Pre-Qualifying
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
            {visiblePredictions.map((p, i) => (
              <PredictionRow
                key={`${animationKey}-${p.driver}`}
                prediction={p}
                index={i}
                maxProb={maxProb}
                isLast={i === visiblePredictions.length - 1}
                isExtra={i >= 5}
                extraIndex={Math.max(i - 5, 0)}
              />
            ))}
          </ol>

          {hiddenCount > 0 && (
            <button
              type="button"
              className="predictions-show-more-button"
              onClick={() => setShowAllPredictions((show) => !show)}
              aria-expanded={showAllPredictions}
            >
              {showAllPredictions ? 'Show Less' : `Show More (${hiddenCount})`}
            </button>
          )}
        </section>

        {/* Footer note */}
        <p style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', fontStyle: 'italic', marginTop: '32px' }}>
          Predictions generated using Gradient Boosting model trained on 2022–2026 F1 data
        </p>

      </div>
    </div>
  )
}
