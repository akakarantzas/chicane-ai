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
      <button onClick={() => onNavigate('history')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => onNavigate('season')} className="nav-link nav-link-active" style={{ width: '100%', textAlign: 'left', padding: '12px 4px' }}>Calendar</button>
    </div>
  )
}

function RaceCard({ round, code, name, country, date, status, cardRef, isMobile }) {
  const isCurrent   = status === 'current'
  const isCompleted = status === 'completed'
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      ref={cardRef}
      className={`race-card season-race-card shrink-0 w-64 bg-[#141418] border rounded-xl px-6 py-6 flex flex-col gap-3 ${
        isCurrent ? 'border-[#E8002D]' : 'border-white/[0.06]'
      } ${isCompleted ? 'opacity-60' : 'opacity-100'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? '#1F1F24' : '#141418',
        borderColor: isHovered ? 'rgba(232, 0, 45, 0.35)' : undefined,
        width: isMobile ? '224px' : '256px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        ...(isCurrent ? { boxShadow: '0 0 0 1px #E8002D, 0 4px 24px rgba(232, 0, 45, 0.35)' } : {}),
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[#A1A1AA] font-medium" style={{ fontSize: '0.95rem' }}>R{round}</span>
        <span className="text-[#A1A1AA] font-medium" style={{ fontSize: '0.95rem' }}>{code}</span>
      </div>
      <p className="font-bold leading-snug text-[#F4F4F5]" style={{ fontSize: '1.2rem' }}>{name}</p>
      <p className="text-[#A1A1AA]" style={{ fontSize: '1rem' }}>{country}</p>
      <p className="text-[#A1A1AA] mt-auto" style={{ fontSize: '1rem' }}>{date}</p>
    </div>
  )
}

export default function Season({ onNavigate }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const currentRef = useRef(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  return (
    <div
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/f1tire.jpg)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.72) 0%, rgba(12,12,14,0.88) 50%, rgba(12,12,14,0.97) 100%)', zIndex: 0 }} />

      {/* Navbar */}
      <nav className="app-nav" style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
        <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', gap: '16px' }}>
          <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
            <button onClick={() => onNavigate('home')} className="brand-button">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">Chicane.ai</span>
            </button>
          </div>
          <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
            <button onClick={() => onNavigate('predictions')} className="nav-link">Predictions</button>
            <button onClick={() => onNavigate('history')} className="nav-link">History</button>
            <button onClick={() => onNavigate('season')} className="nav-link nav-link-active">Calendar</button>

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
          <div className="mb-10">
            <h1 className="page-title">Race Calendar</h1>
            <p className="text-[#A1A1AA] mt-2" style={{ fontSize: '1.1rem' }}>2026 Schedule</p>
          </div>

          {/* Legend */}
          <div className="season-legend flex items-center gap-6 mb-6 text-[#A1A1AA]" style={{ fontSize: '0.9rem' }}>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#141418] border border-[#E8002D] shrink-0" />
              Current race
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#141418] border border-white/[0.06] opacity-60 shrink-0" />
              Completed
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#141418] border border-white/[0.06] shrink-0" />
              Upcoming
            </span>
          </div>

          {/* Scrollable race cards */}
          <div className="calendar-scroll overflow-x-auto pb-4 -mx-6 px-6">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {RACES.map((race) => (
                <RaceCard key={race.round} {...race} cardRef={race.status === 'current' ? currentRef : null} isMobile={isMobile} />
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-white/[0.06] relative" style={{ zIndex: 1, padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 Chicane.ai, All rights reserved.</p>
      </footer>

    </div>
  )
}
