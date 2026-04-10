const RACES = [
  { round: 1,  code: 'AU', name: 'Australian GP',    country: 'Australia',     date: 'Mar 8',  status: 'completed' },
  { round: 2,  code: 'CN', name: 'Chinese GP',        country: 'China',         date: 'Mar 15', status: 'completed' },
  { round: 3,  code: 'JP', name: 'Japanese GP',       country: 'Japan',         date: 'Mar 29', status: 'completed' },
  { round: 4,  code: 'BH', name: 'Bahrain GP',        country: 'Bahrain',       date: 'Apr 12', status: 'current'   },
  { round: 5,  code: 'SA', name: 'Saudi Arabian GP',  country: 'Saudi Arabia',  date: 'Apr 19', status: 'upcoming'  },
  { round: 6,  code: 'US', name: 'Miami GP',          country: 'United States', date: 'May 3',  status: 'upcoming'  },
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

function RaceCard({ round, code, name, country, date, status }) {
  const isCurrent   = status === 'current'
  const isCompleted = status === 'completed'

  return (
    <div
      className={`shrink-0 w-48 bg-[#141418] border rounded-xl px-5 py-5 flex flex-col gap-2 ${
        isCurrent ? 'border-[#E8002D]' : 'border-white/[0.06]'
      } ${isCompleted ? 'opacity-60' : 'opacity-100'}`}
      style={isCurrent ? { boxShadow: '0 0 0 1px #E8002D, 0 4px 24px rgba(232, 0, 45, 0.35)' } : {}}
    >
      <div className="flex items-center justify-between">
        <span className="text-[#A1A1AA] font-medium" style={{ fontSize: '0.8rem' }}>R{round}</span>
        <span className="text-[#A1A1AA] font-medium" style={{ fontSize: '0.8rem' }}>{code}</span>
      </div>
      <p className="font-bold leading-snug text-[#F4F4F5]" style={{ fontSize: '1rem' }}>{name}</p>
      <p className="text-[#A1A1AA]" style={{ fontSize: '0.85rem' }}>{country}</p>
      <p className="text-[#A1A1AA] mt-auto" style={{ fontSize: '0.85rem' }}>{date}</p>
    </div>
  )
}

export default function Season({ onNavigate }) {
  return (
    <div
      className="relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/f1tire.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: '#0C0C0E',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.72) 0%, rgba(12,12,14,0.88) 50%, rgba(12,12,14,0.97) 100%)', zIndex: 0 }} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] px-6" style={{ backgroundColor: 'transparent' }}>
        <div className="flex items-center h-16 max-w-7xl mx-auto">
          <div className="flex-1 flex items-center">
            <button onClick={() => onNavigate('home')} className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/logo-mark.png" alt="" style={{ height: '60px', width: '60px', objectFit: 'contain', marginRight: '-14px' }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.05em', fontSize: '1.9rem', color: '#F4F4F5' }}>Chicane.ai</span>
            </button>
          </div>
          <div className="flex items-center gap-8 text-[#A1A1AA]" style={{ fontSize: '1.05rem', fontWeight: 500 }}>
            <button onClick={() => onNavigate('predictions')} className="hover:text-[#F4F4F5] transition-colors">Predictions</button>
            <button onClick={() => onNavigate('history')} className="hover:text-[#F4F4F5] transition-colors">History</button>
            <button onClick={() => onNavigate('season')} className="text-[#F4F4F5]">Season</button>
            <a href="#how-it-works" className="hover:text-[#F4F4F5] transition-colors">How it works</a>
          </div>
          <div className="flex-1" />
        </div>
      </nav>

      <main className="flex-1 px-6 pb-12 flex flex-col relative" style={{ paddingTop: '80px', zIndex: 1 }}>
        <div className="max-w-5xl mx-auto w-full">

          {/* Header */}
          <div className="mb-10">
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>2026 Season</h1>
            <p className="text-[#A1A1AA] mt-2" style={{ fontSize: '1.1rem' }}>Formula 1 World Championship</p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mb-6 text-[#A1A1AA]" style={{ fontSize: '0.9rem' }}>
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
                <RaceCard key={race.round} {...race} />
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-white/[0.06] relative" style={{ zIndex: 1 }} style={{ padding: '28px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#A1A1AA' }}>Chicane.ai</span>
          <span style={{ fontSize: '1rem', color: '#A1A1AA' }}>Built by Apostolos Kakarantzas</span>
        </div>
      </footer>

    </div>
  )
}
