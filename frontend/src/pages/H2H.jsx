import { useEffect, useState } from 'react'

// ─── Static driver roster ───────────────────────────────────────────────────
const DRIVERS = [
  { abbrev: 'NOR', fullName: 'Lando Norris',      team: 'McLaren',           number: '1'  },
  { abbrev: 'PIA', fullName: 'Oscar Piastri',     team: 'McLaren',           number: '81' },
  { abbrev: 'RUS', fullName: 'George Russell',    team: 'Mercedes',          number: '63' },
  { abbrev: 'ANT', fullName: 'Kimi Antonelli',    team: 'Mercedes',          number: '12' },
  { abbrev: 'VER', fullName: 'Max Verstappen',    team: 'Red Bull Racing',   number: '3'  },
  { abbrev: 'HAD', fullName: 'Isack Hadjar',      team: 'Red Bull Racing',   number: '6'  },
  { abbrev: 'LEC', fullName: 'Charles Leclerc',   team: 'Ferrari',           number: '16' },
  { abbrev: 'HAM', fullName: 'Lewis Hamilton',    team: 'Ferrari',           number: '44' },
  { abbrev: 'ALB', fullName: 'Alex Albon',        team: 'Williams',          number: '23' },
  { abbrev: 'SAI', fullName: 'Carlos Sainz',      team: 'Williams',          number: '55' },
  { abbrev: 'LIN', fullName: 'Arvid Lindblad',    team: 'Racing Bulls',      number: '41' },
  { abbrev: 'LAW', fullName: 'Liam Lawson',       team: 'Racing Bulls',      number: '30' },
  { abbrev: 'STR', fullName: 'Lance Stroll',      team: 'Aston Martin',      number: '18' },
  { abbrev: 'ALO', fullName: 'Fernando Alonso',   team: 'Aston Martin',      number: '14' },
  { abbrev: 'OCO', fullName: 'Esteban Ocon',      team: 'Haas',              number: '31' },
  { abbrev: 'BEA', fullName: 'Oliver Bearman',    team: 'Haas',              number: '87' },
  { abbrev: 'HUL', fullName: 'Nico Hulkenberg',   team: 'Audi',              number: '27' },
  { abbrev: 'BOR', fullName: 'Gabriel Bortoleto', team: 'Audi',              number: '5'  },
  { abbrev: 'GAS', fullName: 'Pierre Gasly',      team: 'Alpine',            number: '10' },
  { abbrev: 'COL', fullName: 'Franco Colapinto',  team: 'Alpine',            number: '43' },
  { abbrev: 'PER', fullName: 'Sergio Perez',      team: 'Cadillac',          number: '11' },
  { abbrev: 'BOT', fullName: 'Valtteri Bottas',   team: 'Cadillac',          number: '77' },
]

const DRIVER_MAP = Object.fromEntries(DRIVERS.map((d) => [d.abbrev, d]))

// ─── Stats config ────────────────────────────────────────────────────────────
const STAT_DEFS = [
  { key: 'champ_position', label: 'Championship Position', lowerIsBetter: true  },
  { key: 'points',         label: 'Points',                lowerIsBetter: false },
  { key: 'wins',           label: 'Wins',                  lowerIsBetter: false },
  { key: 'podiums',        label: 'Podiums',               lowerIsBetter: false },
  { key: 'races',          label: 'Races Completed',       lowerIsBetter: false },
  { key: 'best_finish',    label: 'Best Finish',           lowerIsBetter: true  },
  { key: 'avg_finish',     label: 'Avg Finish',            lowerIsBetter: true  },
]

const D1_COLOR = '#E8002D'
const D2_COLOR = '#CBD5E1'
const HEADING_TEXT_COLOR = '#E5E7EB'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getBarWidths(v1, v2, lowerIsBetter) {
  if (v1 == null || v2 == null) return { w1: 50, w2: 50 }
  if (v1 === v2) return { w1: 50, w2: 50 }
  const sum = v1 + v2
  if (sum === 0) return { w1: 50, w2: 50 }
  if (lowerIsBetter) {
    return { w1: (v2 / sum) * 100, w2: (v1 / sum) * 100 }
  }
  return { w1: (v1 / sum) * 100, w2: (v2 / sum) * 100 }
}

function winner(v1, v2, lowerIsBetter) {
  if (v1 == null || v2 == null) return 'tie'
  if (v1 === v2) return 'tie'
  if (lowerIsBetter) return v1 < v2 ? 'd1' : 'd2'
  return v1 > v2 ? 'd1' : 'd2'
}

// ─── Shared hooks ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ─── Subcomponents ────────────────────────────────────────────────────────────
function HamburgerButton({ onClick, isOpen }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
      style={{
        width: '44px', height: '44px', borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '5px', flexShrink: 0,
      }}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: '20px', height: '2px', borderRadius: '2px', backgroundColor: '#F4F4F5', display: 'block' }} />
      ))}
    </button>
  )
}

function MobileNavDropdown({ onNavigate }) {
  return (
    <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <button onClick={() => onNavigate?.('predictions')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Predictions</button>
      <button onClick={() => onNavigate?.('h2h')} className="nav-link nav-link-active" style={{ width: '100%', textAlign: 'left', padding: '12px 4px' }}>H2H</button>
      <button onClick={() => onNavigate?.('history')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => onNavigate?.('season')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Calendar</button>
      <button onClick={() => onNavigate?.('contact')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Contact</button>
    </div>
  )
}

function DriverInfoCard({ abbrev, accentColor }) {
  const driver = DRIVER_MAP[abbrev] ?? { abbrev, fullName: abbrev, team: '—', number: '—' }
  const glowColor = accentColor === D1_COLOR
    ? 'rgba(232,0,45,0.3)'
    : 'rgba(55,138,221,0.3)'

  return (
    <div
      className="h2h-driver-card"
      style={{ borderTop: `2px solid ${accentColor}` }}
    >
      {/* Initials circle */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        backgroundColor: accentColor,
        boxShadow: `0 0 20px ${glowColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: abbrev === 'VER' ? '#fff' : accentColor === D2_COLOR ? '#111827' : '#fff', fontWeight: 800, fontSize: '24px', letterSpacing: '0.02em' }}>
          {abbrev}
        </span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: HEADING_TEXT_COLOR, marginTop: '12px' }}>{driver.fullName}</div>
      <div style={{ fontSize: '14px', color: '#A1A1AA', marginTop: '4px' }}>{driver.team}</div>
      <div style={{ fontSize: '18px', color: accentColor, fontWeight: 700, marginTop: '6px' }}>#{driver.number}</div>
    </div>
  )
}

function StatBar({ def, d1Val, d2Val }) {
  const { w1, w2 } = getBarWidths(d1Val, d2Val, def.lowerIsBetter)
  const win = winner(d1Val, d2Val, def.lowerIsBetter)
  const d1Wins = win === 'd1'
  const d2Wins = win === 'd2'
  const isTie  = win === 'tie'

  const dotColor = isTie ? null : (d1Wins ? D1_COLOR : D2_COLOR)

  return (
    <div style={{
      backgroundColor: '#1A1A1F',
      borderRadius: '12px',
      padding: '16px 24px',
      marginBottom: '8px',
    }}>
      {/* Label + winner dot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        marginBottom: '4px',
      }}>
        {dotColor && (
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
        )}
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#A1A1AA',
        }}>
          {def.label}
        </div>
      </div>

      {/* Values + bar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
        {/* D1 value */}
        <div style={{
          minWidth: '56px',
          textAlign: 'right',
          fontSize: d1Wins ? '28px' : '22px',
          fontWeight: (d1Wins || isTie) ? 800 : 400,
          color: D1_COLOR,
          opacity: d2Wins ? 0.4 : 1,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          transition: 'font-size 0.3s ease',
        }}>
          {d1Val ?? '—'}
        </div>

        {/* Center bar */}
        <div style={{ flex: 1, height: '8px', display: 'flex' }}>
          <div style={{
            width: `${w1}%`,
            backgroundColor: D1_COLOR,
            borderRadius: '99px',
            transition: 'width 0.4s ease',
          }} />
          <div style={{
            width: `${w2}%`,
            backgroundColor: D2_COLOR,
            borderRadius: '99px',
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* D2 value */}
        <div style={{
          minWidth: '56px',
          textAlign: 'left',
          fontSize: d2Wins ? '28px' : '22px',
          fontWeight: (d2Wins || isTie) ? 800 : 400,
          color: D2_COLOR,
          opacity: d1Wins ? 0.4 : 1,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          transition: 'font-size 0.3s ease',
        }}>
          {d2Val ?? '—'}
        </div>
      </div>
    </div>
  )
}

// ─── Prediction card ─────────────────────────────────────────────────────────
function PredictionCard({ prediction, d1Abbrev, d2Abbrev, loading }) {
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1A1A1F',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '16px',
        border: '1px solid rgba(232,0,45,0.2)',
        boxShadow: '0 0 30px rgba(232,0,45,0.08)',
        textAlign: 'center',
        color: '#A1A1AA',
        fontSize: '14px',
      }}>
        Generating prediction...
      </div>
    )
  }

  if (!prediction) return null

  const winnerAbbrev = prediction.predicted_winner?.toUpperCase()
  const winnerColor  = winnerAbbrev === d1Abbrev.toUpperCase() ? D1_COLOR : D2_COLOR
  const confidencePct = Math.round((prediction.confidence ?? 0) * 100)

  const d1Wins = prediction.h2h_record?.driver1_wins ?? 0
  const d2Wins = prediction.h2h_record?.driver2_wins ?? 0
  const d1IsWinner = winnerAbbrev === d1Abbrev.toUpperCase()

  return (
    <div style={{
      backgroundColor: '#1A1A1F',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '16px',
      border: '1px solid rgba(232,0,45,0.2)',
      boxShadow: '0 0 30px rgba(232,0,45,0.08)',
      textAlign: 'center',
    }}>
      {/* Top label */}
      <div style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#A1A1AA',
        marginBottom: '8px',
      }}>
        Miami GP Head to Head Winner Prediction
      </div>

      {/* Winner name */}
      <div style={{
        fontSize: '28px',
        fontWeight: 800,
        color: winnerColor,
        lineHeight: 1.1,
        marginBottom: '12px',
      }}>
        {prediction.predicted_winner_full_name}
      </div>

      {/* H2H score */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <span style={{
          fontSize: '36px',
          fontWeight: 800,
          color: d1IsWinner ? D1_COLOR : '#52525B',
          fontVariantNumeric: 'tabular-nums',
        }}>{d1Wins}</span>
        <span style={{ fontSize: '24px', color: '#A1A1AA', fontWeight: 400 }}>—</span>
        <span style={{
          fontSize: '36px',
          fontWeight: 800,
          color: !d1IsWinner ? D2_COLOR : '#52525B',
          fontVariantNumeric: 'tabular-nums',
        }}>{d2Wins}</span>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#A1A1AA',
          marginBottom: '6px',
        }}>
          Confidence
        </div>
        <div style={{
          height: '6px',
          borderRadius: '99px',
          backgroundColor: '#27272A',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${confidencePct}%`,
            background: 'linear-gradient(to right, #E8002D, #FF6B35, #FFB800)',
            borderRadius: '99px',
            boxShadow: '0 0 10px rgba(232,0,45,0.6), 0 0 20px rgba(255,107,53,0.3)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: HEADING_TEXT_COLOR,
          marginTop: '6px',
        }}>
          {confidencePct}%
        </div>
      </div>

      {/* Reasoning */}
      {prediction.reasoning && (
        <div style={{
          fontSize: '13px',
          color: '#A1A1AA',
          fontStyle: 'italic',
          marginTop: '12px',
          lineHeight: 1.5,
        }}>
          {prediction.reasoning}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function H2H({ onNavigate }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  const [d1, setD1] = useState('ANT')
  const [d2, setD2] = useState('VER')

  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [result, setResult]             = useState(null)
  const [prediction, setPrediction]     = useState(null)
  const [predLoading, setPredLoading]   = useState(false)

  async function handleCompare() {
    setLoading(true)
    setPredLoading(true)
    setError(null)
    setPrediction(null)

    // Fire both fetches in parallel
    const [compareRes, predictRes] = await Promise.allSettled([
      fetch(`http://localhost:8000/api/h2h/compare?driver1=${d1}&driver2=${d2}&year=2026`),
      fetch(`http://localhost:8000/api/h2h/predict?driver1=${d1}&driver2=${d2}`),
    ])

    // Handle compare
    try {
      if (compareRes.status === 'rejected') throw new Error(compareRes.reason?.message ?? 'Network error')
      const res = compareRes.value
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${res.status}`)
      }
      setResult(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }

    // Handle predict (non-blocking — failure doesn't affect compare results)
    try {
      if (predictRes.status === 'fulfilled' && predictRes.value.ok) {
        setPrediction(await predictRes.value.json())
      }
    } finally {
      setPredLoading(false)
    }
  }

  const selectStyle = {
    width: '100%',
    backgroundColor: '#1A1A1F',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '14px 16px',
    color: HEADING_TEXT_COLOR,
    fontSize: '15px',
    cursor: 'pointer',
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0C0C0E', color: HEADING_TEXT_COLOR }}>

      {/* ── Pulse keyframes ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,0,45,0.4); }
          50%       { box-shadow: 0 0 0 12px rgba(232,0,45,0); }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="app-nav" style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
        <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px', gap: '16px' }}>

          <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
            <button onClick={() => onNavigate?.('home')} className="brand-button" aria-label="Go to home">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">Chicane.ai</span>
            </button>
          </div>

          <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
            <button onClick={() => onNavigate?.('predictions')} className="nav-link">Predictions</button>
            <button onClick={() => onNavigate?.('h2h')} className="nav-link nav-link-active">H2H</button>
            <button onClick={() => onNavigate?.('history')} className="nav-link">History</button>
            <button onClick={() => onNavigate?.('season')} className="nav-link">Calendar</button>
            <button onClick={() => onNavigate?.('contact')} className="nav-link">Contact</button>
          </div>

          {isMobile && (
            <HamburgerButton isOpen={isMenuOpen} onClick={() => setIsMenuOpen((o) => !o)} />
          )}

          <div className="nav-spacer flex-1" style={{ display: isMobile ? 'none' : 'block' }} />
        </div>
        {isMobile && isMenuOpen && <MobileNavDropdown onNavigate={onNavigate} />}
      </nav>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' }}>
        <section style={{ paddingTop: '80px', paddingBottom: '80px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: HEADING_TEXT_COLOR, margin: 0, lineHeight: 1.1 }}>
              Head to Head
            </h1>
            <p style={{ fontSize: '15px', color: '#A1A1AA', marginTop: '10px', marginBottom: 0 }}>
              Compare F1 drivers using real performance data
            </p>
            <div style={{ width: '60px', height: '3px', backgroundColor: '#E8002D', marginTop: '8px', borderRadius: '2px' }} />
          </div>

          {/* ── Driver selection row ── */}
          <div className="h2h-matchup-grid h2h-selector-grid">

            {/* Driver 1 column */}
            <div className="h2h-selector-cell">
              <select
                value={d1}
                onChange={(e) => { setD1(e.target.value); setResult(null); setPrediction(null) }}
                style={selectStyle}
              >
                {DRIVERS.map((d) => (
                  <option key={d.abbrev} value={d.abbrev} style={{ backgroundColor: '#1A1A1F' }}>
                    {d.fullName} — {d.team}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver 2 column */}
            <div className="h2h-selector-cell">
              <select
                value={d2}
                onChange={(e) => { setD2(e.target.value); setResult(null); setPrediction(null) }}
                style={selectStyle}
              >
                {DRIVERS.map((d) => (
                  <option key={d.abbrev} value={d.abbrev} style={{ backgroundColor: '#1A1A1F' }}>
                    {d.fullName} — {d.team}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* ── Driver info cards ── */}
          <div className="h2h-matchup-grid h2h-card-grid">
            <DriverInfoCard abbrev={d1} accentColor={D1_COLOR} />
            <div className="h2h-vs-circle">
              VS
            </div>
            <DriverInfoCard abbrev={d2} accentColor={D2_COLOR} />
          </div>

          {/* ── Compare button ── */}
          <button
            onClick={handleCompare}
            disabled={loading}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: '#E8002D',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: btnHovered && !loading
                ? '0 4px 30px rgba(232,0,45,0.5)'
                : '0 4px 20px rgba(232,0,45,0.3)',
              transition: 'opacity 0.2s, box-shadow 0.2s',
            }}
          >
            {loading ? 'Loading...' : 'Compare'}
          </button>

          {/* ── States ── */}
          {loading && (
            <div style={{ textAlign: 'center', color: '#A1A1AA', fontSize: '15px', marginTop: '40px' }}>
              Fetching real F1 data...
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', color: '#E8002D', fontSize: '15px', marginTop: '40px' }}>
              {error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={{
              backgroundColor: '#1A1A1F',
              border: '1px solid rgba(232,0,45,0.2)',
              boxShadow: '0 0 30px rgba(232,0,45,0.08), inset 0 0 30px rgba(232,0,45,0.03)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginTop: '24px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}>
              <img src="/white-f1-car.png" alt="F1 car" style={{ width: '120px', height: 'auto', opacity: 0.6 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: HEADING_TEXT_COLOR, margin: '0' }}>
                  Pick your drivers
                </div>
                <div style={{ fontSize: '13px', color: '#A1A1AA', margin: '4px 0 0 0' }}>
                  Select any two drivers and hit Compare
                </div>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {!loading && !error && result && (
            <div style={{ marginTop: '40px' }}>
              <div style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#A1A1AA',
                marginBottom: '24px',
              }}>
                {result.year} Season Overview
              </div>

              {STAT_DEFS.map((def) => (
                <StatBar
                  key={def.key}
                  def={def}
                  d1Val={result.driver1?.[def.key]}
                  d2Val={result.driver2?.[def.key]}
                />
              ))}

              <PredictionCard
                prediction={prediction}
                d1Abbrev={d1}
                d2Abbrev={d2}
                loading={predLoading}
              />
            </div>
          )}

        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06]" style={{ padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>
          © 2026 Chicane.ai, All rights reserved.
        </p>
      </footer>

    </div>
  )
}
