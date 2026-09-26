import { useEffect, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useId, useRef } from 'react'

import AppNav from '../components/AppNav'
import { DRIVERS, DRIVER_MAP, getTeamColor } from '../data/drivers'
import useIsMobile from '../hooks/useIsMobile'
import { apiUrl } from '../lib/api'

// ─── Stats config ────────────────────────────────────────────────────────────
const STAT_DEFS = [
  { key: 'champ_position', label: 'Championship Position', lowerIsBetter: true  },
  { key: 'points',         label: 'Championship Points',   lowerIsBetter: false },
  { key: 'wins',           label: 'GP Wins',               lowerIsBetter: false },
  { key: 'podiums',        label: 'GP Podiums',            lowerIsBetter: false },
  { key: 'races',          label: 'GP Result Entries',     lowerIsBetter: false },
  { key: 'best_finish',    label: 'Best GP Finish',        lowerIsBetter: true  },
  { key: 'avg_finish',     label: 'Avg GP Finish',         lowerIsBetter: true  },
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

// ─── Subcomponents ────────────────────────────────────────────────────────────
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
    <div role="group" aria-label={def.label} style={{
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
function SnapshotDetails({ label, freshness, coverage, quality }) {
  if (!freshness) return null
  const status = { fresh: 'Recently retrieved', stale: 'Stale data', unavailable: 'Data unavailable' }[freshness.status] ?? 'Data unavailable'
  return (
    <div className="mb-4 text-xs text-[#A1A1AA]">
      <p role="status">{label}: {status}{freshness.partial ? ' · Partial data' : ''}</p>
      {freshness.status === 'stale' && <p>Using an older snapshot. Results may have changed; compare again to retry when the refresh cooldown ends.</p>}
      <details className="mt-2">
        <summary className="cursor-pointer">Data freshness and coverage · {label}</summary>
        <p className="mt-2">{freshness.retrieved_at ? `Retrieved: ${freshness.retrieved_at}. Age at lookup: ${Math.floor((freshness.age_seconds ?? 0) / 60)} minutes.` : 'No successful retrieval.'}</p>
        <p>Retrieval time is not the provider's publication time. Recently retrieved does not guarantee complete or live results.</p>
        {freshness.refresh_error && <p>Latest refresh could not provide all results. Retry cooldown: {freshness.retry_after_seconds ?? 0} seconds.</p>}
        {coverage?.expected_rounds && <p>GP rounds with records: {coverage.loaded_rounds?.length ?? 0}/{coverage.expected_rounds.length}. Missing rounds: {coverage.missing_rounds?.join(', ') || 'none'}.</p>}
        {Object.entries(quality?.drivers ?? {}).map(([code, driver]) => (
          <p key={code}>{code}: {driver.observed_rounds.length} recorded rounds, {driver.eligible_rounds.length} eligible.
            {' '}No recorded result in rounds: {driver.no_result_rounds.join(', ') || 'none'}.
          </p>
        ))}
        <p>No recorded result can mean missing data or that the driver did not enter; participation is not assumed.</p>
        {quality && <p>Selected result sources: {Object.entries(quality.selected_source_counts).map(([source, count]) => `${source} ${count}`).join(', ') || 'none'}.
          {' '}Source disagreements: {quality.conflicting_result_count}. Code-only identities: {quality.code_only_identity_count}.
        </p>}
      </details>
    </div>
  )
}

function UncertaintyDetails({ prediction, d1Abbrev, d2Abbrev }) {
  const evidence = prediction.uncertainty
  return (
    <div className="my-3 text-xs text-[#A1A1AA]">
      <p>Calibrated confidence unavailable. Heuristic scores are not probabilities.</p>
      {evidence && <>
        <p className="mt-2">Eligible history: {d1Abbrev} {evidence.driver1_eligible_races ?? '—'} races;
          {' '}{d2Abbrev} {evidence.driver2_eligible_races ?? '—'} races; {evidence.shared_races ?? '—'} shared.</p>
        <p className="mt-1">A favorite requires at least {evidence.minimum_eligible_races} eligible races per driver,
          {' '}known chronology and a score gap of at least {evidence.minimum_score_margin}.
          These safeguards do not guarantee accuracy.</p>
        {evidence.data_warnings?.map((warning) => <p role="status" className="mt-2" key={warning}>{warning}</p>)}
      </>}
    </div>
  )
}

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

  const historyYears = prediction.history_scope?.years ?? []
  const historyLabel = historyYears.length ? historyYears.join(', ') : 'Available seasons'
  const predictionTitle = `${prediction.next_race ?? 'Next Grand Prix'} · Finish-ahead prediction`
  const unavailableLabels = {
    insufficient_data: 'Insufficient data',
    insufficient_evidence: 'Insufficient evidence',
    data_unavailable: 'Prediction withheld: incomplete data',
    no_clear_favorite: 'No clear favorite',
    no_upcoming_race: 'No upcoming Grand Prix',
    schedule_time_unknown: 'Race start time unconfirmed',
  }
  const winnerAbbrev = prediction.predicted_winner?.toUpperCase()
  if (prediction.prediction_status !== 'available' || ![d1Abbrev.toUpperCase(), d2Abbrev.toUpperCase()].includes(winnerAbbrev)) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-[#1A1A1F] p-6 text-center">
        <p className="text-xs text-[#A1A1AA]">{predictionTitle}</p>
        <p className="mt-3 text-lg font-semibold text-[#E5E7EB]">
          {unavailableLabels[prediction.prediction_status] ?? 'Prediction unavailable'}
        </p>
        <p className="mt-2 text-sm text-[#A1A1AA]">{prediction.reasoning}</p>
        <UncertaintyDetails prediction={prediction} d1Abbrev={d1Abbrev} d2Abbrev={d2Abbrev} />
      </div>
    )
  }

  const d2IsWinner = winnerAbbrev === d2Abbrev.toUpperCase()
  const winnerColor  = winnerAbbrev === d1Abbrev.toUpperCase() ? D1_COLOR : D2_SECONDARY
  const score = d2IsWinner ? prediction.driver2_score : prediction.driver1_score
  const hasScore = prediction.score_type === 'uncalibrated_heuristic' && Number.isFinite(score) && score >= 0 && score <= 1

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
        {predictionTitle}
      </div>

      <p className="mb-3 text-sm text-[#A1A1AA]">Which driver finishes ahead, regardless of who wins the race?</p>

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

      {/* Historical record scope and scoring rules */}
      <p className="mb-4 text-xs text-[#A1A1AA]">
        Historical head-to-head · {historyLabel} · {prediction.h2h_record?.total_races ?? 0} scored Grands Prix
      </p>
      {prediction.recent_form && (
        <details className="mb-4 text-left text-xs text-[#A1A1AA]">
          <summary className="cursor-pointer">Recent form: last {prediction.recent_form.window_size} eligible Grands Prix per driver</summary>
          <p className="mt-2 leading-relaxed">
            Oldest to newest, using available eligible results before the target race. Windows may include prior seasons
            and different races for each driver. Missing races are not filled in; fewer results mean a smaller sample.
          </p>
          {[[d1Abbrev, prediction.recent_form.driver1], [d2Abbrev, prediction.recent_form.driver2]].map(([code, form]) => (
            <div key={code} className="mt-2">
              <p>{code}: {form?.sample_size ?? 0}/{prediction.recent_form.window_size} results · Average finish {form?.average_finish ?? '—'}</p>
              {form?.status === 'chronology_unavailable' ? (
                <p>Recent form unavailable: race chronology could not be verified.</p>
              ) : (
                <p>{form?.races?.map((race) => `${race.year} ${race.race} (${race.date ?? `round ${race.round}`}) P${race.position}`).join(' → ') || 'No eligible results.'}</p>
              )}
            </div>
          ))}
          {!prediction.recent_form.used_in_score && (
            <p className="mt-2">Recent form is not used in this score because it is unavailable for one or both drivers.</p>
          )}
        </details>
      )}
      <details className="mb-4 text-left text-xs text-[#A1A1AA]">
        <summary className="cursor-pointer">How this comparison is scored</summary>
        <p className="mt-2 leading-relaxed">
          The lower published final position finishes ahead. Retirements count when a valid final position is available.
          Non-starts, disqualifications, explicitly unclassified results, and missing positions are excluded.
          Equal positions award neither driver a win. Sprints are not included in this record.
        </p>
        <p className="mt-2">
          Excluded races: {prediction.h2h_record?.excluded_races ?? 0}. Equal-position races: {prediction.h2h_record?.tied_races ?? 0}.
          The season overview above is separate from this historical record.
        </p>
      </details>
      <UncertaintyDetails prediction={prediction} d1Abbrev={d1Abbrev} d2Abbrev={d2Abbrev} />
      {/* Raw heuristic strength, never presented as probability or confidence. */}
      {hasScore && <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#A1A1AA',
          marginBottom: '6px',
        }}>
          Heuristic score (not probability)
        </div>
        <div style={{
          height: '6px',
          borderRadius: '99px',
          backgroundColor: '#27272A',
          overflow: 'visible',
        }}>
          <div
            className={`h2h-confidence-bar-fill ${d2IsWinner ? 'h2h-confidence-bar-fill-hologram' : ''}`}
            style={{ '--bar-width': `${score * 100}%` }}
          />
        </div>
        <div className="num" style={{
          fontSize: '14px',
          fontWeight: 600,
          color: HEADING_TEXT_COLOR,
          marginTop: '6px',
        }}>
          {score.toFixed(2)} / 1
        </div>
      </div>}

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
  const [btnHovered, setBtnHovered] = useState(false)

  const [d1, setD1] = useState('ANT')
  const [d2, setD2] = useState('VER')

  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [result, setResult]             = useState(null)
  const [prediction, setPrediction]     = useState(null)
  const [predLoading, setPredLoading]   = useState(false)
  const [predError, setPredError] = useState(null)
  const requestVersion = useRef(0)

  function resetSelection() {
    requestVersion.current += 1
    setResult(null)
    setPrediction(null)
    setPredError(null)
    setError(null)
    setLoading(false)
    setPredLoading(false)
  }

  async function handleCompare() {
    const version = ++requestVersion.current
    setLoading(true)
    setPredLoading(true)
    setError(null)
    setPrediction(null)
    setPredError(null)
    let comparison
    try {
      const res = await fetch(apiUrl(`/api/h2h/compare?driver1=${d1}&driver2=${d2}&year=2026`))
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
        setPredLoading(false)
      }
      return
    }
    setLoading(false)
    // Pin the prediction to the exact current-season comparison snapshot.
    try {
      const pin = comparison.freshness?.snapshot_id
      const res = await fetch(apiUrl(`/api/h2h/predict?driver1=${d1}&driver2=${d2}${pin ? `&snapshot_id=${encodeURIComponent(pin)}` : ''}`))
      if (!res.ok) {
        throw new Error(res.status === 409 ? 'The data snapshot changed. Compare again to use matching data.' : 'Prediction unavailable. You can compare again to retry.')
      }
      const data = await res.json()
      if (version === requestVersion.current) setPrediction(data)
    } catch (err) {
      if (version === requestVersion.current) setPredError(err.message)
    } finally {
      if (version === requestVersion.current) setPredLoading(false)
    }
  }

  return (
    <div
      className="page-bg"
      style={{
        minHeight: '100vh',
        color: HEADING_TEXT_COLOR,
        backgroundImage: 'url(/h2h-bg.png)',
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
      <AppNav activePage="h2h" onNavigate={onNavigate} />

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
                onChange={(nextDriver) => { setD1(nextDriver); resetSelection() }}
              />
            </div>

            {/* Driver 2 column */}
            <div className="h2h-selector-cell">
              <DriverDropdown
                value={d2}
                label="Select second driver"
                options={DRIVERS}
                onChange={(nextDriver) => { setD2(nextDriver); resetSelection() }}
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

              {result.coverage?.missing_rounds?.length > 0 && (
                <p role="status" className="mb-6 text-sm text-[#A1A1AA]">
                  Results are incomplete. Missing races: {result.coverage.missing_races?.map((race) => race.race).join(', ') || result.coverage.missing_rounds.join(', ')}.
                </p>
              )}

              <SnapshotDetails label={`${result.year} comparison`} freshness={result.freshness} coverage={result.coverage} quality={result.quality} />

              <div className="mb-6 space-y-2 text-xs text-[#A1A1AA]">
                {result.standings?.status === 'available' ? (
                  <p>
                    Published championship points and positions through {result.standings.through_event?.race}
                    {' '}({result.standings.through_event?.date}), including sprint points and published adjustments.
                  </p>
                ) : (
                  <p role="status">
                    Championship points and positions are unavailable
                    {result.standings?.status === 'stale' ? ' because the published standings have not reached the latest due Grand Prix' : ''}.
                    {' '}They are not estimated from race-only results.
                  </p>
                )}
                <p>
                  GP statistics use loaded Grand Prix results only, not sprints. Result entries include non-starts;
                  they do not mean races completed. Wins, podiums and finishes exclude non-starts, disqualifications
                  and explicitly unclassified results. Retirements count when a valid final position is published.
                </p>
                <p>
                  Finish samples: {result.driver1?.abbreviation ?? d1} {result.driver1?.finish_sample_size ?? 0}
                  {' · '}{result.driver2?.abbreviation ?? d2} {result.driver2?.finish_sample_size ?? 0}.
                  {' '}Unavailable values are shown as —, not zero.
                </p>
                {[result.driver1, result.driver2].some((driver) => driver?.stats_status === 'partial') && (
                  <p role="status">Some GP positions are missing. Finish averages use only the available eligible results.</p>
                )}
                {result.standings?.status === 'available' && [result.driver1, result.driver2].some((driver) => driver?.championship_status !== 'available') && (
                  <p role="status">A selected driver could not be verified in the published standings; their championship values are unavailable.</p>
                )}
              </div>

              {STAT_DEFS.map((def) => (
                <StatBar
                  key={def.key}
                  def={def}
                  d1Val={result.driver1?.[def.key]}
                  d2Val={result.driver2?.[def.key]}
                />
              ))}

              {prediction?.snapshots && (
                <details className="mt-6 text-xs text-[#A1A1AA]">
                  <summary className="mb-3 cursor-pointer">Prediction history data status</summary>
                  {Object.entries(prediction.snapshots).map(([year, snapshot]) => (
                    <SnapshotDetails key={year} label={`${year} history`} freshness={snapshot.freshness} coverage={prediction.coverage?.[year]} quality={snapshot.quality} />
                  ))}
                </details>
              )}
              {prediction?.snapshots && Object.values(prediction.snapshots).some((snapshot) => snapshot.freshness?.status !== 'fresh' || snapshot.freshness?.partial) && (
                <p role="status" className="mt-3 text-xs text-[#A1A1AA]">Some prediction-history snapshots are stale, partial or unavailable. Review the data status above.</p>
              )}
              {predError && <p role="alert" className="mt-4 text-sm text-[#A1A1AA]">{predError}</p>}
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
