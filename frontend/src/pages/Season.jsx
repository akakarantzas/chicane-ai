import { useEffect, useRef, useState } from 'react'
import AppNav from '../components/AppNav'
import { useRaceCalendar } from '../data/races'
import useIsMobile from '../hooks/useIsMobile'

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

export default function Season({ onNavigate }) {
  const isMobile = useIsMobile()
  const races = useRaceCalendar()
  const currentRef = useRef(null)
  const calendarScrollRef = useRef(null)
  const currentRaceRound = races.find((race) => race.status === 'current')?.round

  useEffect(() => {
    const card = currentRef.current
    const container = calendarScrollRef.current
    if (!card || !container) return
    const cardRect = card.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    container.scrollLeft += cardRect.left - containerRect.left - containerRect.width / 2 + cardRect.width / 2
  }, [currentRaceRound])

  useEffect(() => {
    const container = calendarScrollRef.current
    if (!container) return
    const onWheel = (e) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      container.scrollLeft += e.deltaY
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
    <div
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/chicane1.png)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

      {/* Navbar */}
      <AppNav activePage="season" onNavigate={onNavigate} />

      <main className="page-shell flex-1 px-6 flex flex-col" style={{ paddingLeft: isMobile ? '16px' : '32px', paddingRight: isMobile ? '16px' : '32px', paddingTop: isMobile ? '40px' : '64px' }}>
        <div className="max-w-5xl mx-auto w-full">

          {/* Header */}
          <div className="home-calendar-header" style={{ marginBottom: isMobile ? '20px' : '24px' }}>
            <h1 className="section-heading home-calendar-title" style={{ margin: 0 }}>
              Race Calendar
            </h1>
            <div className="home-calendar-controls" aria-label="Race calendar controls">
              <button className="home-calendar-control" type="button" aria-label="Scroll calendar left" onClick={() => scrollCalendar(-1)}>
                ‹
              </button>
              <button className="home-calendar-control" type="button" aria-label="Scroll calendar right" onClick={() => scrollCalendar(1)}>
                ›
              </button>
            </div>
          </div>

          {/* Scrollable race cards */}
          <div className="home-calendar-frame history-coming-card">
            <div className="calendar-scroll home-calendar-scroll overflow-x-auto" ref={calendarScrollRef}>
              <div className="home-calendar-track">
              {races.map((race) => (
                <RaceCard key={race.round} {...race} cardRef={race.status === 'current' ? currentRef : null} />
              ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-white/[0.06] relative" style={{ zIndex: 1, padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 ChicaneAI, All rights reserved.</p>
      </footer>

    </div>
  )
}
