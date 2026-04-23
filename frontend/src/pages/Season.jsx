import { useEffect, useRef, useState } from 'react'

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
      <button onClick={() => onNavigate('history')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => onNavigate('season')} className="nav-link nav-link-active" style={{ width: '100%', textAlign: 'left', padding: '12px 4px' }}>Calendar</button>
      <button onClick={() => onNavigate('contact')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Contact</button>
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
      <p className="home-calendar-date" style={isCurrent ? { color: '#E8002D' } : undefined}>{date}</p>
    </div>
  )
}

export default function Season({ onNavigate }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const currentRef = useRef(null)
  const calendarScrollRef = useRef(null)

  useEffect(() => {
    const card = currentRef.current
    const container = calendarScrollRef.current
    if (!card || !container) return
    const cardRect = card.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    container.scrollLeft += cardRect.left - containerRect.left - containerRect.width / 2 + cardRect.width / 2
  }, [])

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
        backgroundImage: 'url(/f1tire.jpg)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

      {/* Navbar */}
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
            <button onClick={() => onNavigate('history')} className="nav-link">History</button>
            <button onClick={() => onNavigate('season')} className="nav-link nav-link-active">Calendar</button>
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
          <div className="home-calendar-frame">
            <div className="calendar-scroll home-calendar-scroll overflow-x-auto" ref={calendarScrollRef}>
              <div className="home-calendar-track">
              {RACES.map((race) => (
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
