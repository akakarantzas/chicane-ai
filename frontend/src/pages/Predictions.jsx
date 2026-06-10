import { useEffect, useRef, useState } from 'react'

import AppNav from '../components/AppNav'
import useIsMobile from '../hooks/useIsMobile'
import { apiUrl } from '../lib/api'

const POSITION_COLORS = ['#E8002D', '#f97316', '#eab308']

function positionColor(i) {
  return POSITION_COLORS[i] ?? '#A1A1AA'
}

function PredictionRow({ prediction, index, isLast, isExtra = false, extraIndex = 0 }) {
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

function GhostPredictionRow({ prediction, onExpand }) {
  const rowRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [displayPct, setDisplayPct] = useState(0)
  const pctValue = prediction.probability * 100

  useEffect(() => {
    const node = rowRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect() } },
      { threshold: 0.35 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return undefined
    const duration = 2880
    const delay = 5 * 55 + 180
    let frameId
    let timeoutId
    const startAnimation = () => {
      const start = performance.now()
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1)
        setDisplayPct(pctValue * (1 - Math.pow(1 - progress, 3)))
        if (progress < 1) frameId = requestAnimationFrame(tick)
      }
      frameId = requestAnimationFrame(tick)
    }
    timeoutId = window.setTimeout(startAnimation, delay)
    return () => { window.clearTimeout(timeoutId); if (frameId) cancelAnimationFrame(frameId) }
  }, [isVisible, pctValue])

  return (
    <div style={{ position: 'relative', marginTop: '8px' }} ref={rowRef}>
      <div
        aria-hidden="true"
        className="prediction-row predictions-page-row"
        style={{
          backgroundColor: 'rgba(18,18,22,0.9)',
          borderLeft: '3px solid transparent',
          borderBottom: 'none',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span
          className="predictions-rank num"
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#A1A1AA',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          6
        </span>
        <div className="predictions-row-content" style={{ flex: 1, minWidth: 0 }}>
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
                  width: `${pctValue.toFixed(1)}%`,
                  borderRadius: '999px',
                  animation: 'none',
                }}
              />
            </div>
            <span className="predictions-percent num">
              {displayPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(12,12,14,0.05) 0%, rgba(12,12,14,0.97) 72%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={onExpand}
          style={{
            background: 'none',
            border: 'none',
            color: '#71717A',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 12px',
            letterSpacing: '0.02em',
          }}
        >
          show more
        </button>
      </div>
    </div>
  )
}

export default function Predictions({ onNavigate, animationKey = 0 }) {
  const isMobile = useIsMobile()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playAnimations, setPlayAnimations] = useState(false)
  const [showAllPredictions, setShowAllPredictions] = useState(false)

  useEffect(() => {
    fetch(apiUrl('/api/predictions/next-race'))
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

  const { race, circuit, predictions, status } = data
  const raceTitle = race !== 'TBD' ? race.replace(/\bGP\b/g, 'Grand Prix') : 'Next Race'
  const visiblePredictions = showAllPredictions ? predictions : predictions.slice(0, 5)
  const hiddenCount = Math.max(predictions.length - 5, 0)

  return (
    <div
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/chicane4.png)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

      {/* Navbar */}
      <AppNav activePage="predictions" onNavigate={onNavigate} />

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
                {status}
              </span>
            </div>
          )}
        </div>

        {/* Prediction rows */}
        <section className="predictions-page-card history-coming-card">
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
                isLast={i === visiblePredictions.length - 1}
                isExtra={i >= 5}
                extraIndex={Math.max(i - 5, 0)}
              />
            ))}
          </ol>

          {hiddenCount > 0 && !showAllPredictions && (
            <GhostPredictionRow
              prediction={predictions[5]}
              onExpand={() => setShowAllPredictions(true)}
            />
          )}

          {showAllPredictions && (
            <button
              type="button"
              onClick={() => setShowAllPredictions(false)}
              style={{
                display: 'block',
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#71717A',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '4px 12px',
                letterSpacing: '0.02em',
                marginTop: '8px',
                textAlign: 'center',
              }}
            >
              show less
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
