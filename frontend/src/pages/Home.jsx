import { useEffect, useRef, useState } from 'react'
import NextRaceCircuitCard from '../components/NextRaceCircuitCard'
import ButtonHeartbeatEffectDemo from '../components/ui/heartbeat-effect-button'
import { nextRaceCircuit } from '../data/circuits'
const RACES = [
  { round: 1,  code: 'AU', name: 'Australian GP',    country: 'Australia',     date: 'Mar 8',  status: 'completed' },
  { round: 2,  code: 'CN', name: 'Chinese GP',        country: 'China',         date: 'Mar 15', status: 'completed' },
  { round: 3,  code: 'JP', name: 'Japanese GP',       country: 'Japan',         date: 'Mar 29', status: 'completed' },
  { round: 4,  code: 'BH', name: 'Bahrain GP',        country: 'Bahrain',       date: 'Apr 12', status: 'completed' },
  { round: 5,  code: 'SA', name: 'Saudi Arabian GP',  country: 'Saudi Arabia',  date: 'Apr 19', status: 'completed' },
  { round: 6,  code: 'US', name: 'Miami GP',          country: 'United States', date: 'May 3',  status: 'current'   },
  { round: 7,  code: 'CA', name: 'Canadian GP',       country: 'Canada',        date: 'May 24', status: 'upcoming'  },
  { round: 8,  code: 'MC', name: 'Monaco GP',         country: 'Monaco',        date: 'Jun 7',  status: 'upcoming'  },
  { round: 9,  code: 'ES', name: 'Spanish GP',        country: 'Spain',         date: 'Jun 14', status: 'upcoming'  },
  { round: 10, code: 'AT', name: 'Austrian GP',       country: 'Austria',       date: 'Jun 28', status: 'upcoming'  },
  { round: 11, code: 'GB', name: 'British GP',        country: 'United Kingdom',date: 'Jul 5',  status: 'upcoming'  },
  { round: 12, code: 'BE', name: 'Belgian GP',        country: 'Belgium',       date: 'Jul 19', status: 'upcoming'  },
  { round: 13, code: 'HU', name: 'Hungarian GP',      country: 'Hungary',       date: 'Jul 26', status: 'upcoming'  },
  { round: 14, code: 'NL', name: 'Dutch GP',          country: 'Netherlands',   date: 'Aug 23', status: 'upcoming'  },
  { round: 15, code: 'IT', name: 'Italian GP',        country: 'Italy',         date: 'Sep 6',  status: 'upcoming'  },
  { round: 16, code: 'ES', name: 'Spanish GP',        country: 'Spain',         date: 'Sep 13', status: 'upcoming'  },
  { round: 17, code: 'AZ', name: 'Azerbaijan GP',     country: 'Azerbaijan',    date: 'Sep 26', status: 'upcoming'  },
  { round: 18, code: 'SG', name: 'Singapore GP',      country: 'Singapore',     date: 'Oct 11', status: 'upcoming'  },
  { round: 19, code: 'US', name: 'United States GP',  country: 'United States', date: 'Oct 25', status: 'upcoming'  },
  { round: 20, code: 'MX', name: 'Mexico City GP',    country: 'Mexico',        date: 'Nov 1',  status: 'upcoming'  },
  { round: 21, code: 'BR', name: 'Sao Paulo GP',      country: 'Brazil',        date: 'Nov 8',  status: 'upcoming'  },
  { round: 22, code: 'US', name: 'Las Vegas GP',      country: 'United States', date: 'Nov 22', status: 'upcoming'  },
  { round: 23, code: 'QA', name: 'Qatar GP',          country: 'Qatar',         date: 'Nov 29', status: 'upcoming'  },
  { round: 24, code: 'AE', name: 'Abu Dhabi GP',      country: 'UAE',           date: 'Dec 6',  status: 'upcoming'  },
]

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
        <span
          key={line}
          style={{
            width: '20px',
            height: '2px',
            borderRadius: '2px',
            backgroundColor: '#F4F4F5',
            display: 'block',
          }}
        />
      ))}
    </button>
  )
}

function MobileNavDropdown({ onNavigate }) {
  const navigate = (page) => {
    onNavigate(page)
  }

  return (
    <div style={{
      width: '100%',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '8px 0 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <button onClick={() => navigate('predictions')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Predictions</button>
      <button onClick={() => navigate('h2h')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>H2H</button>
      <button onClick={() => navigate('history')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => navigate('season')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Calendar</button>
      <button onClick={() => navigate('contact')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Contact</button>
    </div>
  )
}

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
      <p className="home-calendar-date">{date}</p>
    </div>
  )
}

function CountdownCard({ value, label, isMobile }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="interactive-card countdown-card premium-stat-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: isMobile ? '12px' : '24px',
        textAlign: 'center',
        minHeight: '120px',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      <div className="countdown-value premium-number" style={{ fontSize: '52px', fontWeight: '700', lineHeight: '1' }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

function LatestPredictionCard({ prediction, index, isMobile }) {
  const [isHovered, setIsHovered] = useState(false)
  const pct = (prediction.probability * 100).toFixed(1)
  const barWidth = `${(prediction.probability / TOP3[0].probability) * 100}%`
  const barColor = BAR_COLORS[index]

  return (
    <div
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
        <div className="premium-bar-fill" style={{ width: barWidth, '--bar-start': barColor }} />
      </div>
      <span style={{ fontSize: '17px', fontWeight: 700, color: '#F4F4F5', minWidth: '48px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
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
      <span className="premium-number" style={{
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

const TOP3 = [
  { driver: 'Antonelli', probability: 0.7091 },
  { driver: 'Russell',   probability: 0.1787 },
  { driver: 'Leclerc',   probability: 0.0606 },
]

const BAR_COLORS = ['#E8002D', '#f97316', '#eab308']

const RACE_DATE = new Date('2026-05-03T19:30:00Z')

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { days, hours, minutes, seconds } = useCountdown(RACE_DATE.getTime())
  const currentRaceRef = useRef(null)
  const calendarScrollRef = useRef(null)
  const statsRef = useRef(null)
  const [statsVisible, setStatsVisible] = useState(false)

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
    container.scrollLeft += cardRect.left - containerRect.left - containerRect.width / 2 + cardRect.width / 2
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
      <nav className="app-nav hero-nav" style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
        <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px', gap: '16px' }}>

          {/* Left: logo */}
          <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
            <button onClick={() => onNavigate('home')} className="brand-button" aria-label="Go to home">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">Chicane.ai</span>
            </button>
          </div>

          {/* Center: nav links */}
          <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
            <button onClick={() => onNavigate('predictions')} className="nav-link">Predictions</button>
            <button onClick={() => onNavigate('h2h')} className="nav-link">H2H</button>
            <button onClick={() => onNavigate('history')} className="nav-link">History</button>
            <button onClick={() => onNavigate('season')} className="nav-link">Calendar</button>
            <button onClick={() => onNavigate('contact')} className="nav-link">Contact</button>

          </div>

          {isMobile && (
            <HamburgerButton
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            />
          )}

          {/* Right: spacer */}
          <div className="nav-spacer flex-1" style={{ display: isMobile ? 'none' : 'block' }} />

        </div>
        {isMobile && isMenuOpen && <MobileNavDropdown onNavigate={onNavigate} />}
      </nav>

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
            AI-powered F1 predictions updated every race weekend.
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
              raceName="Miami Grand Prix"
              round="Round 6 · 2026"
              venue="Miami International Autodrome"
              date="May 3, 2026"
              status="Pre-Qualifying"
              countryLabel="Miami · US"
              circuitPath={nextRaceCircuit.path}
              viewBox={nextRaceCircuit.viewBox}
              start={nextRaceCircuit.start}
            />
          </div>
            <div style={{ marginTop: isMobile ? '24px' : '32px' }}>
              {/* Countdown grid */}
              <div className="countdown-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? '8px' : '20px', marginBottom: 0, order: 2 }}>
                {[
                  { value: days,    label: 'Days'    },
                  { value: hours,   label: 'Hours'   },
                  { value: minutes, label: 'Minutes' },
                  { value: seconds, label: 'Seconds' },
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
          <div className="home-calendar-frame">
            <button className="home-calendar-side-control home-calendar-side-control-left" type="button" aria-label="Scroll calendar left" onClick={() => scrollCalendar(-1)}>
              ‹
            </button>
            <div className="calendar-scroll home-calendar-scroll overflow-x-auto" ref={calendarScrollRef}>
              <div className="home-calendar-track">
              {RACES.map((race) => (
                <RaceCard key={race.round} {...race} cardRef={race.status === 'current' ? currentRaceRef : null} />
              ))}
              </div>
            </div>
            <button className="home-calendar-side-control home-calendar-side-control-right" type="button" aria-label="Scroll calendar right" onClick={() => scrollCalendar(1)}>
              ›
            </button>
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
          <p style={{ fontSize: '14px', color: '#A1A1AA', marginBottom: '24px' }}>Miami Grand Prix · Pre-qualifying</p>

          {/* Driver cards */}
          {TOP3.map((p, i) => (
            <LatestPredictionCard key={p.driver} prediction={p} index={i} isMobile={isMobile} />
          ))}

          <button
            onClick={() => onNavigate('predictions')}
            className="secondary-action"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1A1A1F'
              e.currentTarget.style.color = '#F4F4F5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#A1A1AA'
            }}
          >
            View full predictions →
          </button>
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
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 Chicane.ai, All rights reserved.</p>
      </footer>

    </div>
  )
}
