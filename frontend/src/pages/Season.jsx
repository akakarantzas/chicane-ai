import AppNav from '../components/AppNav'
import RaceCalendar from '../components/RaceCalendar'
import { useRaceCalendar } from '../data/races'
import useIsMobile from '../hooks/useIsMobile'

export default function Season({ onNavigate }) {
  const isMobile = useIsMobile()
  const races = useRaceCalendar()

  return (
    <div
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/season-bg.png)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

      {/* Navbar */}
      <AppNav activePage="season" onNavigate={onNavigate} />

      <main className="page-shell flex-1 px-6 flex flex-col" style={{ paddingLeft: isMobile ? '16px' : '32px', paddingRight: isMobile ? '16px' : '32px', paddingTop: isMobile ? '40px' : '64px' }}>
        <div className="max-w-5xl mx-auto w-full">

          <RaceCalendar
            races={races}
            frameClassName="history-coming-card"
            headerStyle={{ marginBottom: isMobile ? '20px' : '24px' }}
            heading={(
              <h1 className="section-heading home-calendar-title" style={{ margin: 0 }}>
                Race Calendar
              </h1>
            )}
          />

        </div>
      </main>

      <footer className="border-t border-white/6 relative" style={{ zIndex: 1, padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 ChicaneAI, All rights reserved.</p>
      </footer>

    </div>
  )
}
