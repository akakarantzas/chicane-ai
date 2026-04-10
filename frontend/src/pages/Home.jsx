import { useEffect, useState } from 'react'

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

const TOP3 = [
  { driver: 'Verstappen', probability: 0.5 },
  { driver: 'Leclerc', probability: 0.47 },
  { driver: 'Norris', probability: 0.28 },
]

const BAR_COLORS = ['#E8002D', '#f97316', '#eab308']

const RACE_DATE = new Date('2026-04-12T15:00:00Z')

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

function CountdownUnit({ value, label }) {
  return (
    <div style={{
      backgroundColor: '#1A1A1F',
      borderRadius: '14px',
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '100px',
      flex: 1,
    }}>
      <p className="tabular-nums text-[#F4F4F5]" style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1 }}>{String(value).padStart(2, '0')}</p>
      <p className="text-[#A1A1AA] uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.12em', marginTop: '10px' }}>{label}</p>
    </div>
  )
}

export default function Home({ onNavigate }) {
  const { days, hours, minutes, seconds } = useCountdown(RACE_DATE.getTime())

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#F4F4F5] flex flex-col">

      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] px-6"
        style={{ backgroundColor: 'transparent' }}
      >
        <div className="flex items-center h-16 max-w-7xl mx-auto">

          {/* Left: logo */}
          <div className="flex-1 flex items-center">
            <img src="/logo-mark.png" alt="" style={{ height: '60px', width: '60px', objectFit: 'contain', marginRight: '-14px' }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.05em', fontSize: '1.9rem', color: '#F4F4F5' }}>Chicane.ai</span>
          </div>

          {/* Center: nav links */}
          <div className="flex items-center gap-8 text-[#A1A1AA]" style={{ fontSize: '1.05rem', fontWeight: 500 }}>
            <button onClick={() => onNavigate('predictions')} className="hover:text-[#F4F4F5] transition-colors">Predictions</button>
            <button onClick={() => onNavigate('history')} className="hover:text-[#F4F4F5] transition-colors">History</button>
            <button onClick={() => onNavigate('season')} className="hover:text-[#F4F4F5] transition-colors">Season</button>
            <a href="#how-it-works" className="hover:text-[#F4F4F5] transition-colors">How it works</a>
          </div>

          {/* Right: spacer */}
          <div className="flex-1" />

        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', backgroundColor: '#0C0C0E', paddingTop: '80px', paddingBottom: '80px' }}>
        {/* Background video */}
        <video
          src="/hero-video.mp4"
          autoPlay={true}
          muted={true}
          loop={true}
          playsInline={true}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.35 }}
        />
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(12,12,14,0.4) 0%, rgba(12,12,14,0.8) 100%)' }} />
        {/* Content */}
        <div className="relative max-w-2xl mx-auto space-y-6" style={{ zIndex: 2 }}>
          {/* Badge */}
          <span className="inline-flex items-center bg-green-900/40 text-green-400 font-medium rounded-full border border-green-800/50" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
            Correctly identified all 4 top finishers at Monaco 2025
          </span>

          <h1 className="tracking-tight" style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1 }}>
            Predict. Verify. Repeat.
          </h1>

          <p className="leading-relaxed" style={{ fontSize: '1.25rem', color: '#A1A1AA' }}>
            AI-powered F1 predictions updated every race weekend.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('predictions')}
              className="bg-[#E8002D] hover:bg-[#E8002D]/90 text-[#F4F4F5] font-semibold rounded-lg transition-colors"
              style={{ fontSize: '1rem', padding: '14px 28px' }}
            >
              See predictions
            </button>
            <a
              href="#how-it-works"
              className="border border-white/[0.06] hover:border-white/20 font-medium rounded-lg transition-colors"
              style={{ fontSize: '1rem', padding: '14px 28px' }}
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 32px' }}>
          <div className="grid grid-cols-2 divide-x divide-white/[0.06] text-center">
            <div className="px-4">
              <p className="font-bold text-[#F4F4F5]" style={{ fontSize: '3rem', fontWeight: 700 }}>74%</p>
              <p className="text-[#A1A1AA] mt-1" style={{ fontSize: '0.95rem' }}>Top-3 prediction accuracy</p>
            </div>
            <div className="px-4">
              <p className="font-bold text-[#F4F4F5]" style={{ fontSize: '3rem', fontWeight: 700 }}>1</p>
              <p className="text-[#A1A1AA] mt-1" style={{ fontSize: '0.95rem' }}>Race predicted</p>
            </div>
          </div>
        </div>
      </section>

      {/* Next Race countdown */}
      <section>
        <div style={{ padding: '80px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E8002D' }}></div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#A1A1AA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Next Race</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {/* Countdown grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 120px)', gap: '20px', justifyContent: 'center', marginBottom: '32px' }}>
                {[
                  { value: days,    label: 'Days'    },
                  { value: hours,   label: 'Hours'   },
                  { value: minutes, label: 'Minutes' },
                  { value: seconds, label: 'Seconds' },
                ].map((item) => (
                  <div key={item.label} style={{
                    backgroundColor: '#1A1A1F',
                    borderRadius: '14px',
                    padding: '32px 16px',
                    textAlign: 'center',
                    borderTop: '2px solid #E8002D',
                    minHeight: '120px',
                  }}>
                    <div style={{ fontSize: '52px', fontWeight: '700', color: '#F4F4F5', lineHeight: '1' }}>
                      {String(item.value).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
              {/* Race info */}
              <div style={{ fontSize: '13px', color: '#E8002D', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '12px', textTransform: 'uppercase' }}>Round 4 · 2026</div>
              <h2 style={{ fontSize: '36px', fontWeight: '700', color: '#F4F4F5', lineHeight: '1.1', margin: '0 0 12px 0' }}>Bahrain Grand Prix</h2>
              <p style={{ fontSize: '16px', color: '#A1A1AA', margin: '0 0 24px 0' }}>Bahrain International Circuit · April 12, 2026</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <span style={{ backgroundColor: 'rgba(232,0,45,0.1)', color: '#E8002D', border: '1px solid rgba(232,0,45,0.2)', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: '600' }}>Race Weekend</span>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 14px', fontSize: '13px' }}>Bahrain · BH</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2026 Calendar */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 32px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 700, color: '#F4F4F5', marginBottom: '32px' }}>
            2026 Season Calendar
          </h2>
          <div className="calendar-scroll overflow-x-auto pb-2">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {RACES.map((race) => (
                <RaceCard key={race.round} {...race} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Latest Prediction */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 32px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 700, color: '#F4F4F5', marginBottom: '32px' }}>
            Latest Prediction
          </h2>

          <ol className="space-y-5 mb-10">
            {TOP3.map((p, i) => {
              const pct = (p.probability * 100).toFixed(0)
              const barWidth = `${(p.probability / TOP3[0].probability) * 100}%`
              return (
                <li key={p.driver} className="flex items-center gap-5">
                  <span className="w-6 text-right font-semibold text-[#A1A1AA] shrink-0" style={{ fontSize: '1.1rem' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: '1.15rem', fontWeight: 600 }}>{p.driver}</span>
                      <span className="tabular-nums text-[#A1A1AA]" style={{ fontSize: '1.15rem' }}>{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-[#27272A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: barWidth, backgroundColor: BAR_COLORS[i] }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          <button
            onClick={() => onNavigate('predictions')}
            className="w-full border border-white/[0.06] hover:border-white/20 font-medium py-3.5 rounded-lg transition-colors"
            style={{ fontSize: '1rem' }}
          >
            View full predictions →
          </button>
        </div>
      </section>

      {/* Season stats */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ padding: '80px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { number: '24', label: 'Races' },
                { number: '11', label: 'Teams' },
                { number: '22', label: 'Drivers' },
                { number: '6', label: 'Sprints' },
              ].map((stat) => (
                <div key={stat.label} style={{
                  backgroundColor: '#1A1A1F',
                  borderRadius: '12px',
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '140px',
                  position: 'relative',
                  overflow: 'hidden',
                  borderTop: '2px solid #E8002D',
                }}>
                  <span style={{
                    fontSize: '48px',
                    fontWeight: '700',
                    color: '#F4F4F5',
                    lineHeight: '1',
                    position: 'relative',
                    zIndex: 1,
                  }}>{stat.number}</span>
                  <span style={{
                    fontSize: '14px',
                    color: '#A1A1AA',
                    marginTop: '10px',
                    position: 'relative',
                    zIndex: 1,
                    letterSpacing: '0.05em',
                  }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]" style={{ padding: '28px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#A1A1AA' }}>Chicane.ai</span>
          <span style={{ fontSize: '1rem', color: '#A1A1AA' }}>Built by Apostolos Kakarantzas</span>
        </div>
      </footer>

    </div>
  )
}
