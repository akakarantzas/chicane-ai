import { useEffect, useRef, useState } from 'react'

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

// Shared by Home and Season: scrollable race cards centred on the current race.
export default function RaceCalendar({ races, heading, headerStyle, frameId, frameClassName = '' }) {
  const currentRaceRef = useRef(null)
  const calendarScrollRef = useRef(null)
  const currentRaceRound = races.find((race) => race.status === 'current')?.round

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
    let idleTimer
    const onWheel = (e) => {
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (delta === 0) return
      e.preventDefault()
      container.style.scrollSnapType = 'none'
      container.style.scrollBehavior = 'auto'
      container.scrollLeft += delta
      window.clearTimeout(idleTimer)
      // After the wheel goes idle restore CSS — browser will smooth-snap to nearest card
      idleTimer = window.setTimeout(() => {
        container.style.scrollSnapType = ''
        container.style.scrollBehavior = ''
      }, 150)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', onWheel)
      window.clearTimeout(idleTimer)
    }
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
    <>
      <div className="home-calendar-header" style={headerStyle}>
        {heading}
        <div className="home-calendar-controls" aria-label="Race calendar controls">
          <button className="home-calendar-control" type="button" aria-label="Scroll calendar left" onClick={() => scrollCalendar(-1)}>
            ‹
          </button>
          <button className="home-calendar-control" type="button" aria-label="Scroll calendar right" onClick={() => scrollCalendar(1)}>
            ›
          </button>
        </div>
      </div>
      <div id={frameId} className={`home-calendar-frame ${frameClassName}`.trim()}>
        <div className="calendar-scroll home-calendar-scroll overflow-x-auto" ref={calendarScrollRef}>
          <div className="home-calendar-track">
          {races.map((race) => (
            <RaceCard key={race.round} {...race} cardRef={race.status === 'current' ? currentRaceRef : null} />
          ))}
          </div>
        </div>
      </div>
    </>
  )
}
