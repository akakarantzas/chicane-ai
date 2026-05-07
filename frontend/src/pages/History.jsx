import { useEffect, useState } from 'react'

const MIAMI_GP_2026 = {
  race: 'Miami Grand Prix',
  circuit: 'Miami International Autodrome',
  date: 'May 3, 2026',
  model: 'Gradient Boosting',
  status: 'Winner predicted',
  actualWinner: 'Antonelli',
  predictions: [
    { driver: 'Antonelli', team: 'Mercedes', probability: 0.7091 },
    { driver: 'Russell', team: 'Mercedes', probability: 0.1787 },
    { driver: 'Leclerc', team: 'Ferrari', probability: 0.0606 },
    { driver: 'Hamilton', team: 'Ferrari', probability: 0.0134 },
    { driver: 'Verstappen', team: 'Red Bull Racing', probability: 0.0129 },
    { driver: 'Norris', team: 'McLaren', probability: 0.0063 },
    { driver: 'Piastri', team: 'McLaren', probability: 0.0063 },
    { driver: 'Hadjar', team: 'Red Bull Racing', probability: 0.0042 },
    { driver: 'Gasly', team: 'Alpine', probability: 0.0042 },
    { driver: 'Bearman', team: 'Haas', probability: 0.0042 },
    { driver: 'Albon', team: 'Williams', probability: 0.0032 },
    { driver: 'Sainz', team: 'Williams', probability: 0.0031 },
    { driver: 'Alonso', team: 'Aston Martin', probability: 0.0029 },
    { driver: 'Stroll', team: 'Aston Martin', probability: 0.0027 },
    { driver: 'Ocon', team: 'Haas', probability: 0.0026 },
    { driver: 'Bortoleto', team: 'Audi', probability: 0.0024 },
    { driver: 'Hulkenberg', team: 'Audi', probability: 0.0023 },
    { driver: 'Lawson', team: 'Racing Bulls', probability: 0.0021 },
    { driver: 'Lindblad', team: 'Racing Bulls', probability: 0.0019 },
    { driver: 'Colapinto', team: 'Alpine', probability: 0.0018 },
    { driver: 'Perez', team: 'Cadillac', probability: 0.0016 },
    { driver: 'Bottas', team: 'Cadillac', probability: 0.0015 },
  ],
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
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
      <button onClick={() => onNavigate('predictions')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Predictions</button>
      <button onClick={() => onNavigate('h2h')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>H2H</button>
      <button onClick={() => onNavigate('history')} className="nav-link nav-link-active" style={{ width: '100%', textAlign: 'left', padding: '12px 4px' }}>History</button>
      <button onClick={() => onNavigate('season')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Calendar</button>
      <button onClick={() => onNavigate('contact')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Contact</button>
    </div>
  )
}

function StatBlock({ label, value, accent = false }) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(12,12,14,0.42)',
        border: '1px solid rgba(244,244,245,0.08)',
      }}
    >
      <div className="num" style={{ color: accent ? '#22C55E' : '#F4F4F5', fontSize: '24px', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: '7px', color: '#A1A1AA', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0 }}>{label}</div>
    </div>
  )
}

function PredictionArchiveRow({ prediction, index, actualWinner, isMobile }) {
  const isWinner = prediction.driver === actualWinner
  const pctValue = prediction.probability * 100
  const [displayPct, setDisplayPct] = useState(0)
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
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '38px minmax(0, 1fr) 70px' : '48px minmax(150px, 0.9fr) minmax(180px, 1fr) 78px',
        alignItems: 'center',
        gap: isMobile ? '12px' : '16px',
        padding: isMobile ? '13px 0' : '14px 0',
        borderTop: index === 0 ? '0' : '1px solid rgba(244,244,245,0.07)',
      }}
    >
      <span className="num" style={{ color: isWinner ? '#22C55E' : '#A1A1AA', fontSize: '17px', textAlign: 'center' }}>{index + 1}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ overflow: 'hidden', color: '#F4F4F5', fontSize: '15px', fontWeight: 800, lineHeight: 1.15, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prediction.driver}</span>
        </div>
        <div style={{ marginTop: '4px', color: '#A1A1AA', fontSize: '12px', fontWeight: 600 }}>{prediction.team}</div>
      </div>
      {!isMobile && (
        <div className="predictions-bar-track" style={{ height: '9px', borderRadius: '999px', backgroundColor: 'rgba(5,5,8,0.82)', overflow: 'visible', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.9), 0 0 0 1px rgba(34,197,94,0.08)' }}>
          <div
            className="predictions-bar-fill history-archive-bar-fill"
            style={{
              width: '0%',
              height: '100%',
              borderRadius: '999px',
              background: '#22C55E',
              boxShadow: '0 0 10px rgba(34,197,94,0.62), 0 0 20px rgba(34,197,94,0.34)',
              '--bar-width': `${pctValue}%`,
              animation: 'prediction-bar-grow 2.88s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              animationDelay: barDelay,
            }}
          />
        </div>
      )}
      <span className="num" style={{ color: '#F4F4F5', fontSize: '15px', textAlign: 'right' }}>{displayPct.toFixed(1)}%</span>
    </li>
  )
}

function VerifiedRaceCard({ race, isMobile }) {
  const [showFullGrid, setShowFullGrid] = useState(false)
  const displayedPredictions = showFullGrid ? race.predictions : race.predictions.slice(0, 5)

  return (
    <section
      className="history-coming-card"
      style={{
        overflow: 'hidden',
        borderRadius: '8px',
        background:
          'radial-gradient(circle at top right, rgba(34,197,94,0.16) 0%, rgba(34,197,94,0.06) 23%, rgba(34,197,94,0) 48%), linear-gradient(145deg, rgba(244,244,245,0.05), rgba(244,244,245,0.018) 42%, rgba(12,12,14,0.5)), rgba(18,18,22,0.9)',
        border: '1px solid rgba(244,244,245,0.09)',
        boxShadow: '0 22px 48px rgba(0,0,0,0.38), inset 0 1px 0 rgba(244,244,245,0.08)',
        padding: isMobile ? '20px' : '24px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <span style={{ display: 'inline-flex', color: '#22C55E', fontSize: '11px', fontWeight: 800, lineHeight: 1, textTransform: 'uppercase', letterSpacing: 0 }}>{race.status}</span>
          <h2 style={{ marginTop: '10px', color: '#F4F4F5', fontSize: isMobile ? '27px' : '34px', fontWeight: 800, lineHeight: 1.05 }}>{race.race}</h2>
          <p style={{ marginTop: '8px', color: '#A1A1AA', fontSize: '14px' }}>{race.circuit} / {race.date}</p>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(34,197,94,0.11)', border: '1px solid rgba(34,197,94,0.28)', color: '#22C55E', fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap' }}>
          Verified
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px', marginTop: '24px' }}>
        <StatBlock label="Model pick" value={race.predictions[0].driver} accent />
        <StatBlock label="Actual winner" value={race.actualWinner} accent />
        <StatBlock label="Win probability" value={formatPercent(race.predictions[0].probability)} />
      </div>

      <div style={{ marginTop: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
          <span style={{ color: '#F4F4F5', fontSize: '14px', fontWeight: 800 }}>Archived prediction order</span>
          <span style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 700 }}>{race.model}</span>
        </div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {displayedPredictions.map((prediction, index) => (
            <PredictionArchiveRow
              key={prediction.driver}
              prediction={prediction}
              index={index}
              actualWinner={race.actualWinner}
              isMobile={isMobile}
            />
          ))}
        </ol>
        {race.predictions.length > 5 && (
          <button
            type="button"
            onClick={() => setShowFullGrid((open) => !open)}
            style={{
              width: '100%',
              height: '42px',
              marginTop: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(244,244,245,0.105)',
              backgroundColor: 'rgba(12,12,14,0.26)',
              color: '#E5E7EB',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {showFullGrid ? 'Show top 5' : `Show full grid (${race.predictions.length})`}
          </button>
        )}
      </div>
    </section>
  )
}

export default function History({ onNavigate }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    document.body.classList.add('history-scrollbar')
    return () => document.body.classList.remove('history-scrollbar')
  }, [])

  return (
    <div
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/prediction-history.png)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

      <nav className="app-nav" style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
        <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px', gap: '16px' }}>
          <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
            <button onClick={() => onNavigate('home')} className="brand-button">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">ChicaneAI</span>
            </button>
          </div>
          <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
            <button onClick={() => onNavigate('predictions')} className="nav-link">Predictions</button>
            <button onClick={() => onNavigate('h2h')} className="nav-link">H2H</button>
            <button onClick={() => onNavigate('history')} className="nav-link nav-link-active">History</button>
            <button onClick={() => onNavigate('season')} className="nav-link">Calendar</button>
            <button onClick={() => onNavigate('contact')} className="nav-link">Contact</button>
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

      <main className="page-shell flex-1 px-6 relative" style={{ paddingLeft: isMobile ? '16px' : '32px', paddingRight: isMobile ? '16px' : '32px', paddingTop: isMobile ? '40px' : '64px' }}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <h1 className="page-title">Prediction History</h1>
            <p className="text-[#A1A1AA] mt-2" style={{ fontSize: '15px' }}>Track record of AI predictions vs actual race results</p>
          </div>

          <VerifiedRaceCard race={MIAMI_GP_2026} isMobile={isMobile} />
        </div>
      </main>

      <footer className="border-t border-white/[0.06] relative" style={{ zIndex: 1, padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 ChicaneAI, All rights reserved.</p>
      </footer>
    </div>
  )
}
