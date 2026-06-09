import { useEffect, useRef, useState } from 'react'
import AppNav from '../components/AppNav'
import NextRaceCircuitCard from '../components/NextRaceCircuitCard'
import ButtonHeartbeatEffectDemo from '../components/ui/heartbeat-effect-button'
import { circuits } from '../data/circuits'
import { MIAMI_TOP_PREDICTIONS } from '../data/predictions'
import { getNextRace, useRaceCalendar } from '../data/races'
import useIsMobile from '../hooks/useIsMobile'
import canadaTrack from '../assets/circuits/canada-track-white.png'
import monacoTrack from '../assets/circuits/monaco-track-white.png'

function RaceCard({ name, country, date, status, cardRef }) {
  const isCurrent   = status === 'current'
  const isCompleted = status === 'completed'
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      ref={cardRef}
      className={`home-calendar-card ${isCurrent ? 'home-calendar-card-active' : ''} ${isCompleted ? 'home-calendar-card-completed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
      }}
    >
      <p className="home-calendar-race">{name}</p>
      <p className="home-calendar-location">{country}</p>
      <p className="home-calendar-date" style={isCurrent ? { color: '#E8002D' } : undefined}>{date}</p>
    </div>
  )
}

function CountdownCard({ value, label, isMobile, accent }) {
  return (
    <div
      className="interactive-card countdown-card premium-stat-card"
      style={{
        padding: isMobile ? '12px' : '24px',
        textAlign: 'center',
        minHeight: '120px',
      }}
    >
      <div className="countdown-content">
        <div
          className="countdown-number countdown-value premium-number num"
          style={accent ? { color: '#E8002D' } : undefined}
        >
          {String(value).padStart(2, '0')}
        </div>
        <div className="countdown-label">
          {label}
        </div>
      </div>
    </div>
  )
}

function LatestPredictionCard({ prediction, index, isMobile }) {
  const [isHovered, setIsHovered] = useState(false)
  const rowRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [displayPct, setDisplayPct] = useState(0)
  const pctValue = prediction.probability * 100
  const barWidth = `${pctValue}%`
  const barColor = BAR_COLORS[index]

  useEffect(() => {
    const node = rowRef.current
    if (!node) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return undefined

    const duration = 2880
    const delay = index * 55 + 180
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

    timeoutId = window.setTimeout(startAnimation, delay)

    return () => {
      window.clearTimeout(timeoutId)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [index, isVisible, pctValue])

  return (
    <div
      ref={rowRef}
      className="latest-prediction-row premium-prediction-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: isMobile ? '16px' : '24px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderLeft: '3px solid #E8002D',
        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
      }}
    >
      <span
        className="home-prediction-rank predictions-rank-podium"
        style={{ '--rank-fill': barColor }}
      >
        {index + 1}
      </span>
      <span style={{ fontSize: '17px', fontWeight: 700, color: '#F4F4F5', flex: 1 }}>{prediction.driver}</span>
      <div className="latest-bar premium-bar-track" style={{ width: '120px', height: '5px', flexShrink: 0 }}>
        <div
          className="premium-bar-fill"
          style={{
            width: isVisible ? barWidth : '0%',
            transition: 'width 2.88s cubic-bezier(0.2, 0.8, 0.2, 1)',
            transitionDelay: `${index * 55 + 180}ms`,
          }}
        />
      </div>
      <span className="num" style={{ fontSize: '17px', fontWeight: 700, color: '#F4F4F5', width: '60px', flexShrink: 0, textAlign: 'right' }}>{displayPct.toFixed(1)}%</span>
    </div>
  )
}

function StatCard({ number, label }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="interactive-card stat-card premium-stat-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '140px',
        position: 'relative',
        overflow: 'hidden',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      <span className="premium-number num" style={{
        fontSize: '48px',
        fontWeight: '700',
        lineHeight: '1',
        position: 'relative',
        zIndex: 1,
      }}>{number}</span>
      <span style={{
        fontSize: '14px',
        color: '#A1A1AA',
        marginTop: '10px',
        position: 'relative',
        zIndex: 1,
        letterSpacing: '0.05em',
      }}>{label}</span>
    </div>
  )
}

function GhostPredictionRow({ isMobile, onNavigate }) {
  const rowRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [displayPct, setDisplayPct] = useState(0)
  const pctValue = 1.3

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
    const delay = 3 * 55 + 180
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
  }, [isVisible])

  return (
    <div style={{ position: 'relative' }} ref={rowRef}>
      <div
        aria-hidden="true"
        className="latest-prediction-row premium-prediction-row"
        style={{
          padding: isMobile ? '16px' : '24px',
          marginBottom: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          borderLeft: '3px solid #E8002D',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span
          className="home-prediction-rank num"
          style={{ fontSize: '22px', fontWeight: 800, color: '#A1A1AA', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          4
        </span>
        <span style={{ fontSize: '17px', fontWeight: 700, color: '#F4F4F5', flex: 1 }}>Hamilton</span>
        <div className="latest-bar premium-bar-track" style={{ width: '120px', height: '5px', flexShrink: 0 }}>
          <div className="premium-bar-fill" style={{ width: '1.3%' }} />
        </div>
        <span className="num" style={{ fontSize: '17px', fontWeight: 700, color: '#F4F4F5', width: '60px', flexShrink: 0, textAlign: 'right' }}>{displayPct.toFixed(1)}%</span>
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
          onClick={() => onNavigate('predictions')}
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
          view all predictions
        </button>
      </div>
    </div>
  )
}

const TOP3 = MIAMI_TOP_PREDICTIONS

const BAR_COLORS = ['#E8002D', '#f97316', '#eab308']

function useCountUp(target, duration = 1500, isVisible) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!isVisible) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [isVisible, target, duration])
  return count
}

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target - Date.now()))

  useEffect(() => {
    setTimeLeft(Math.max(0, target - Date.now()))

    const id = setInterval(() => {
      setTimeLeft(Math.max(0, target - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [target])

  const totalSeconds = Math.floor(timeLeft / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

export default function Home({ onNavigate }) {
  const isMobile = useIsMobile()
  const races = useRaceCalendar(1000)
  const currentRace = races.find((race) => race.status === 'current') ?? getNextRace()
  const countdownTarget = new Date(currentRace.raceAt).getTime()
  const { days, hours, minutes, seconds } = useCountdown(countdownTarget)
  const currentRaceRef = useRef(null)
  const calendarScrollRef = useRef(null)
  const currentRaceRound = currentRace?.round
  const statsRef = useRef(null)
  const [statsVisible, setStatsVisible] = useState(false)
  const currentRaceName = currentRace.name.replace(/\bGP\b/g, 'Grand Prix')
  const currentRaceDate = `${currentRace.date}, 2026`
  const currentRaceCountryLabel = `${currentRace.city ?? currentRace.country} · ${currentRace.code}`
  const currentRaceCircuit = currentRace.code === 'MC' ? circuits.monaco : currentRace.code === 'CA' ? circuits.canada : null
  const currentRaceTrackImage = currentRace.code === 'MC' ? monacoTrack : currentRace.code === 'CA' ? canadaTrack : null

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const card = currentRaceRef.current
    const container = calendarScrollRef.current
    if (!card || !container) return
    const cardRect = card.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    // Disable smooth so the page loads already centred — no slide-in animation
    container.style.scrollBehavior = 'auto'
    container.scrollLeft += cardRect.left - containerRect.left - containerRect.width / 2 + cardRect.width / 2
    container.style.scrollBehavior = ''
  }, [currentRaceRound])

  useEffect(() => {
    const container = calendarScrollRef.current
    if (!container) return
    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (delta === 0) return
      e.preventDefault()
      container.style.scrollSnapType = 'none'
      container.style.scrollBehavior = 'auto'
      container.scrollLeft += delta
      // After the wheel goes idle restore CSS — browser will smooth-snap to nearest card
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  const scrollCalendar = (direction) => {
    const container = calendarScrollRef.current
    if (!container) return
    const scrollAmount = Math.min(container.clientWidth * 0.72, 640)
    container.scrollBy({
      left: direction * scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="home-page min-h-screen bg-[#0C0C0E] text-[#F4F4F5] flex flex-col">

      {/* Navbar */}
      <AppNav onNavigate={onNavigate} variant="hero" />

      {/* Hero */}
      <section className="hero-section home-hero flex-1 flex flex-col items-center justify-center text-center px-6" style={{ position: 'relative', minHeight: '100vh', height: '100vh', overflow: 'hidden', backgroundColor: '#0C0C0E', paddingTop: isMobile ? '84px' : '96px', paddingBottom: isMobile ? '72px' : '96px', paddingLeft: isMobile ? '20px' : '80px', paddingRight: isMobile ? '20px' : '80px', textAlign: 'center' }}>
        {/* Background video */}
        <video
          src="/hero-video.mp4"
          autoPlay={true}
          muted={true}
          loop={true}
          playsInline={true}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 42%', zIndex: 0, opacity: 0.36 }}
        />
        {/* Dark overlay */}
        <div className="hero-lighting" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
        {/* Content */}
        <div className="hero-content relative max-w-2xl mx-auto space-y-6" style={{ zIndex: 2, textAlign: 'center' }}>
          {/* Badge */}
          <span className="hero-badge inline-flex items-center font-medium rounded-full" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
            Miami GP predictions now live!
          </span>

          <h1 className="hero-title tracking-tight" style={{ fontSize: isMobile ? '42px' : '72px' }}>
            Predict. Verify. Repeat.
          </h1>

          <p className="hero-subcopy leading-relaxed" style={{ fontSize: '16px', color: '#A1A1AA' }}>
            AI-powered F1 analytics updated every race weekend.
          </p>

          <div className="hero-actions flex items-center justify-center gap-3">
            <ButtonHeartbeatEffectDemo onClick={() => onNavigate('predictions')}>
              See predictions
            </ButtonHeartbeatEffectDemo>
          </div>
        </div>

      </section>

      {/* Next Race countdown */}
      <section className="section-band" style={{ paddingTop: isMobile ? '40px' : '80px', paddingBottom: isMobile ? '40px' : '80px' }}>
        <div className="section-shell" style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
          <div>
            <NextRaceCircuitCard
              raceName={currentRaceName}
              round={`Round ${currentRace.round} · 2026 Season`}
              venue={currentRace.venue ?? 'Race weekend'}
              date={currentRaceDate}
              status="Pre-Qualifying"
              countryLabel={currentRaceCountryLabel}
              trackImage={currentRaceTrackImage}
              trackAlt={`${currentRaceName} Circuit`}
              showTrackImage={currentRace.code === 'MC'}
              circuitPath={currentRaceCircuit?.path}
              viewBox={currentRaceCircuit?.viewBox}
              animationDuration={4300}
              showAnimatedPath={currentRace.code !== 'MC'}
              showDebugPath={false}
              pathVariant="glow"
              alignOverlayWithTrackImage={currentRace.code === 'MC'}
            />
          </div>
            <div style={{ marginTop: isMobile ? '24px' : '32px' }}>
              {/* Countdown grid */}
              <div className="countdown-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? '8px' : '20px', marginBottom: 0, order: 2 }}>
                {[
                  { value: days,    label: 'Days'    },
                  { value: hours,   label: 'Hours'   },
                  { value: minutes, label: 'Minutes' },
                  { value: seconds, label: 'Seconds', accent: true },
                ].map((item) => (
                  <CountdownCard key={item.label} {...item} isMobile={isMobile} />
                ))}
              </div>
            </div>
        </div>
      </section>

      {/* 2026 Calendar */}
      <section className="section-band home-calendar-section" style={{ paddingTop: isMobile ? '40px' : '80px', paddingBottom: isMobile ? '40px' : '80px' }}>
        <div className="section-shell" style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
          <div className="home-calendar-header">
            <h2 className="section-heading home-calendar-title">
              Race Calendar
            </h2>
            <div className="home-calendar-controls" aria-label="Race calendar controls">
              <button className="home-calendar-control" type="button" aria-label="Scroll calendar left" onClick={() => scrollCalendar(-1)}>
                ‹
              </button>
              <button className="home-calendar-control" type="button" aria-label="Scroll calendar right" onClick={() => scrollCalendar(1)}>
                ›
              </button>
            </div>
          </div>
          <div id="home-race-calendar" className="home-calendar-frame">
            <div className="calendar-scroll home-calendar-scroll overflow-x-auto" ref={calendarScrollRef}>
              <div className="home-calendar-track">
              {races.map((race) => (
                <RaceCard key={race.round} {...race} cardRef={race.status === 'current' ? currentRaceRef : null} />
              ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Prediction */}
      <section className="section-band" style={{ paddingTop: isMobile ? '40px' : '80px', paddingBottom: isMobile ? '40px' : '80px' }}>
        <div className="section-shell" style={{ padding: isMobile ? '0 16px' : '0 32px' }}>

          {/* Section label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E8002D', flexShrink: 0 }} />
            <span className="section-kicker" style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Latest Prediction</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', lineHeight: 1.2 }}>
            <span style={{ fontSize: '14px', color: '#A1A1AA', lineHeight: 1.2 }}>Miami Grand Prix</span>
            <span style={{ fontSize: '14px', color: '#A1A1AA', lineHeight: 1.2 }}>·</span>
            <span style={{ color: '#E8002D', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>
              Pre-Qualifying
            </span>
          </div>

          {/* Driver cards */}
          {TOP3.map((p, i) => (
            <LatestPredictionCard key={p.driver} prediction={p} index={i} isMobile={isMobile} />
          ))}

          {/* Ghost 4th row + depth fade + "view all predictions" */}
          <GhostPredictionRow isMobile={isMobile} onNavigate={onNavigate} />
        </div>
      </section>

      {/* Season stats */}
      <section className="section-band" style={{ paddingTop: isMobile ? '40px' : '80px', paddingBottom: isMobile ? '40px' : '80px' }}>
        <div className="section-shell" style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
          <div ref={statsRef} className="stats-grid" style={{ gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
              {[
                { number: useCountUp(24, 1500, statsVisible), label: 'Races' },
                { number: useCountUp(11, 1500, statsVisible), label: 'Teams' },
                { number: useCountUp(22, 1500, statsVisible), label: 'Drivers' },
                { number: useCountUp(6,  1500, statsVisible), label: 'Sprints' },
              ].map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]" style={{ padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 ChicaneAI, All rights reserved.</p>
      </footer>

    </div>
  )
}

