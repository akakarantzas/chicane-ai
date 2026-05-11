import { useEffect, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useId, useRef } from 'react'

import { apiUrl } from '../lib/api'

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

const TEAM_COLORS = {
  McLaren: '#FF8000',
  Mercedes: '#27F4D2',
  'Red Bull Racing': '#3671C6',
  Ferrari: '#E80020',
  Williams: '#64C4FF',
  'Racing Bulls': '#6692FF',
  'Aston Martin': '#229971',
  Haas: '#B6BABD',
  Audi: '#52E252',
  Sauber: '#52E252',
  Alpine: '#FF87BC',
  Cadillac: '#D4AF37',
  fallback: '#FF003C',
}

function getTeamColor(teamName) {
  return TEAM_COLORS[teamName] ?? TEAM_COLORS.fallback
}

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

const D1_COLOR = 'var(--red-driver)'
const D1_BORDER = 'var(--red-border)'
const D1_BACKGROUND_OVERLAY = 'rgba(225, 6, 0, 0.08)'
const D2_COLOR = '#AEEBFF'
const D2_SECONDARY = '#DDF4FF'
const D2_GLOW = '#AEEBFF'
const HEADING_TEXT_COLOR = '#E5E7EB'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getBarWidths(v1, v2) {
  if (v1 == null || v2 == null) return { w1: 50, w2: 50 }
  if (v1 === v2) return { w1: 50, w2: 50 }
  const sum = v1 + v2
  if (sum === 0) return { w1: 50, w2: 50 }
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
      <button onClick={() => onNavigate?.('history')} className="nav-link nav-link-history" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => onNavigate?.('season')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Calendar</button>
      <button onClick={() => onNavigate?.('contact')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Contact</button>
    </div>
  )
}

function DriverDropdown({ value, onChange, options, label }) {
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const listboxId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const selectedIndex = Math.max(options.findIndex((driver) => driver.abbrev === value), 0)
  const selected = options[selectedIndex]
  const [activeIndex, setActiveIndex] = useState(selectedIndex)

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  function chooseDriver(index) {
    const driver = options[index]
    if (!driver) return
    onChange(driver.abbrev)
    setIsOpen(false)
    requestAnimationFrame(() => buttonRef.current?.focus())
  }

  function focusOption(index) {
    const boundedIndex = (index + options.length) % options.length
    setActiveIndex(boundedIndex)
    requestAnimationFrame(() => {
      menuRef.current?.querySelector(`[data-option-index="${boundedIndex}"]`)?.scrollIntoView({ block: 'nearest' })
    })
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(activeIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(activeIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setIsOpen(true)
      focusOption(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) chooseDriver(activeIndex)
      else setIsOpen(true)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <div className="h2h-driver-dropdown" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className="h2h-driver-dropdown-button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="h2h-driver-dropdown-copy">
          <span className="h2h-driver-dropdown-name">{selected.fullName}</span>
          <span className="h2h-driver-dropdown-team">{selected.team}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h2h-driver-dropdown-chevron ${isOpen ? 'h2h-driver-dropdown-chevron-open' : ''}`}
          size={20}
          strokeWidth={2.2}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${listboxId}-option-${activeIndex}`}
            className="h2h-driver-dropdown-menu"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {options.map((driver, index) => {
              const isSelected = driver.abbrev === value
              const isActive = index === activeIndex

              return (
                <button
                  key={driver.abbrev}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  className={`h2h-driver-dropdown-option ${isSelected ? 'h2h-driver-dropdown-option-selected' : ''} ${isActive ? 'h2h-driver-dropdown-option-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseDriver(index)}
                >
                  <span className="h2h-driver-dropdown-option-main">
                    <span className="h2h-driver-dropdown-option-name">{driver.fullName}</span>
                    <span className="h2h-driver-dropdown-option-team">{driver.team}</span>
                  </span>
                  {isSelected && <Check aria-hidden="true" size={17} strokeWidth={2.4} className="h2h-driver-dropdown-check" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DriverInfoCard({ abbrev, teamColor }) {
  const driver = DRIVER_MAP[abbrev] ?? { abbrev, fullName: abbrev, team: '—', number: '—' }
  const avatarColor = teamColor ?? getTeamColor(driver.team)

  return (
    <div
      className="h2h-driver-card"
      style={{ borderTop: `2px solid ${avatarColor}` }}
    >
      {/* Initials circle */}
      <div
        className="transition-all duration-500"
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${avatarColor} 58%, #FFFFFF) 0%, ${avatarColor} 54%, color-mix(in srgb, ${avatarColor} 72%, #05050A) 100%)`,
          boxShadow: `0 0 9px color-mix(in srgb, ${avatarColor} 32%, transparent), 0 0 18px color-mix(in srgb, ${avatarColor} 14%, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '24px', letterSpacing: '0.02em' }}>
          {abbrev}
        </span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: HEADING_TEXT_COLOR, marginTop: '12px' }}>{driver.fullName}</div>
      <div style={{ fontSize: '14px', color: '#A1A1AA', marginTop: '4px' }}>{driver.team}</div>
      <div
        className="num"
        style={{
          fontSize: '18px',
          color: avatarColor,
          fontWeight: 700,
          marginTop: '6px',
          transition: 'color 0.5s ease, text-shadow 0.5s ease',
          textShadow: `0 0 10px color-mix(in srgb, ${avatarColor} 28%, transparent)`,
        }}
      >
        #{driver.number}
      </div>
    </div>
  )
}

function StatBar({ def, d1Val, d2Val }) {
  const { w1, w2 } = getBarWidths(d1Val, d2Val)
  const win = winner(d1Val, d2Val, def.lowerIsBetter)
  const d1Wins = win === 'd1'
  const d2Wins = win === 'd2'
  const isTie  = win === 'tie'

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
        <div className="num" style={{
          minWidth: '56px',
          textAlign: 'right',
          fontSize: d1Wins ? '28px' : '22px',
          fontWeight: 800,
          color: D1_COLOR,
          flexShrink: 0,
          transition: 'font-size 0.3s ease',
        }}>
          {d1Val ?? '—'}
        </div>

        {/* Center bar */}
        <div style={{ flex: 1, height: '8px', display: 'flex' }}>
          <div
            className="h2h-stat-segment-left"
            style={{
            width: `${w1}%`,
            borderRadius: '99px',
            transition: 'width 0.4s ease',
          }}
          />
          <div
            className="h2h-stat-segment-hologram"
            style={{
              width: `${w2}%`,
              borderRadius: '99px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* D2 value */}
        <div className="num" style={{
          minWidth: '56px',
          textAlign: 'left',
          fontSize: d2Wins ? '28px' : '22px',
          fontWeight: 800,
          color: D2_SECONDARY,
          textShadow: d2Wins ? `0 0 8px rgba(244,250,255,.28), 0 0 16px rgba(127,228,255,.2)` : 'none',
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
        border: '1px solid var(--red-border)',
        boxShadow: `0 0 18px rgba(225,6,0,0.045)`,
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
  const d2IsWinner = winnerAbbrev === d2Abbrev.toUpperCase()
  const winnerColor  = winnerAbbrev === d1Abbrev.toUpperCase() ? D1_COLOR : D2_SECONDARY
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
      border: '1px solid var(--red-border)',
      boxShadow: `0 0 18px rgba(225,6,0,0.045)`,
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
        textShadow: d2IsWinner ? `0 0 5px rgba(244,250,255,.18), 0 0 10px rgba(127,228,255,.1)` : 'none',
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
        <span className="num" style={{
          fontSize: '36px',
          fontWeight: 800,
          color: d1IsWinner ? D1_COLOR : '#52525B',
        }}>{d1Wins}</span>
        <span style={{ fontSize: '24px', color: '#A1A1AA', fontWeight: 400 }}>—</span>
        <span className="num" style={{
          fontSize: '36px',
          fontWeight: 800,
          color: !d1IsWinner ? D2_SECONDARY : '#52525B',
          textShadow: !d1IsWinner ? `0 0 9px rgba(244,250,255,.3), 0 0 18px rgba(127,228,255,.2)` : 'none',
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
          overflow: 'visible',
        }}>
          <div
            className={`h2h-confidence-bar-fill ${d2IsWinner ? 'h2h-confidence-bar-fill-hologram' : ''}`}
            style={{ '--bar-width': `${confidencePct}%` }}
          />
        </div>
        <div className="num" style={{
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
      fetch(apiUrl(`/api/h2h/compare?driver1=${d1}&driver2=${d2}&year=2026`)),
      fetch(apiUrl(`/api/h2h/predict?driver1=${d1}&driver2=${d2}`)),
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

  return (
    <div
      className="page-bg"
      style={{
        minHeight: '100vh',
        color: HEADING_TEXT_COLOR,
        backgroundImage: 'url(/chicane3.png)',
        position: 'relative',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

      {/* ── Pulse keyframes ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,0,60,0.4); }
          50%       { box-shadow: 0 0 0 12px rgba(255,0,60,0); }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="app-nav" style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
        <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px', gap: '16px' }}>

          <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
            <button onClick={() => onNavigate?.('home')} className="brand-button" aria-label="Go to home">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">ChicaneAI</span>
            </button>
          </div>

          <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
            <button onClick={() => onNavigate?.('predictions')} className="nav-link">Predictions</button>
            <button onClick={() => onNavigate?.('h2h')} className="nav-link nav-link-active">H2H</button>
            <button onClick={() => onNavigate?.('history')} className="nav-link nav-link-history">History</button>
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
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px', position: 'relative', zIndex: 1 }}>
        <section style={{ paddingTop: '80px', paddingBottom: '80px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: HEADING_TEXT_COLOR, margin: 0, lineHeight: 1.1 }}>
              Head to Head
            </h1>
            <p style={{ fontSize: '15px', color: '#A1A1AA', marginTop: '10px', marginBottom: 0 }}>
              Compare F1 drivers using real performance data
            </p>
            <div style={{ width: '60px', height: '3px', backgroundColor: D1_COLOR, marginTop: '8px', borderRadius: '2px' }} />
          </div>

          {/* ── Driver selection row ── */}
          <div className="h2h-matchup-grid h2h-selector-grid">

            {/* Driver 1 column */}
            <div className="h2h-selector-cell">
              <DriverDropdown
                value={d1}
                label="Select first driver"
                options={DRIVERS}
                onChange={(nextDriver) => { setD1(nextDriver); setResult(null); setPrediction(null) }}
              />
            </div>

            {/* Driver 2 column */}
            <div className="h2h-selector-cell">
              <DriverDropdown
                value={d2}
                label="Select second driver"
                options={DRIVERS}
                onChange={(nextDriver) => { setD2(nextDriver); setResult(null); setPrediction(null) }}
              />
            </div>

          </div>

          {/* ── Driver info cards ── */}
          <div className="h2h-matchup-grid h2h-card-grid">
            <DriverInfoCard abbrev={d1} teamColor={getTeamColor(DRIVER_MAP[d1]?.team)} />
            <div className="h2h-vs-circle">
              VS
            </div>
            <DriverInfoCard abbrev={d2} teamColor={getTeamColor(DRIVER_MAP[d2]?.team)} />
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
              backgroundColor: D1_COLOR,
              color: '#fff',
              border: '1px solid var(--red-border)',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: btnHovered && !loading
                ? '0 3px 8px rgba(225,6,0,0.18)'
                : 'none',
              transition: 'background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
            }}
          >
            {loading ? <span className="loading-dots">Loading</span> : 'Compare'}
          </button>

          {/* ── States ── */}
          {loading && (
            <div
              role="status"
              aria-label="Fetching real F1 data"
              style={{
                marginTop: '40px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '18px',
              }}
            >
              <div style={{
                display: 'flex', gap: '6px', padding: '10px', borderRadius: '10px',
                background: '#0C0C0E', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    padding: '8px 6px', borderRadius: '4px',
                    background: '#05050A', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    {[0, 1].map((j) => (
                      <span key={j} className="f1-light" style={{
                        width: '14px', height: '14px', borderRadius: '999px',
                        background: D1_BACKGROUND_OVERLAY, display: 'block',
                        animation: `f1-light-seq 2.6s ease-in-out ${i * 0.28}s infinite`,
                      }} />
                    ))}
                  </div>
                ))}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '11px', fontWeight: 800, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: '#A1A1AA',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '99px',
                  background: D1_COLOR,
                  animation: 'f1-pulse 1s ease-in-out infinite',
                }} />
                Fetching real F1 data...
              </div>

              <style>{`
                @keyframes f1-light-seq {
                  0%, 8%    { background: rgba(225,6,0,0.08); box-shadow: none; }
                  12%, 72%  { background: var(--red-driver); box-shadow: 0 0 12px var(--red-glow); }
                  76%, 100% { background: rgba(225,6,0,0.08); box-shadow: none; }
                }
                @keyframes f1-pulse {
                  0%, 100% { opacity: 0.35; }
                  50%      { opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                  .f1-light { animation: none !important; background: var(--red-driver) !important; }
                }
              `}</style>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', color: D1_COLOR, fontSize: '15px', marginTop: '40px' }}>
              {error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={{
              background:
                'linear-gradient(145deg, rgba(244,244,245,0.018), rgba(244,244,245,0.006) 42%, rgba(12,12,14,0.18)), rgba(18,18,22,0.38)',
              border: '1px solid rgba(255,0,60,0.2)',
              boxShadow: '0 14px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(244,244,245,0.045)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
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
      <footer className="border-t border-white/[0.06]" style={{ padding: '28px 32px', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>
          © 2026 ChicaneAI, All rights reserved.
        </p>
      </footer>

    </div>
  )
}
