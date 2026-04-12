
import { useState } from 'react'

function HistoryCard({ children }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="interactive-card border border-dashed border-white/[0.06] rounded-xl px-6 py-10 text-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? '#222228' : '#1A1A1F',
        transition: 'background-color 0.2s ease',
      }}
    >
      {children}
    </div>
  )
}

export default function History({ onNavigate }) {
  return (
    <div
      className="page-bg relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/f1red.jpg)',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.72) 0%, rgba(12,12,14,0.88) 50%, rgba(12,12,14,0.97) 100%)', zIndex: 0 }} />

      {/* Navbar */}
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="brand-wrap">
            <button onClick={() => onNavigate('home')} className="brand-button">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">Chicane.ai</span>
            </button>
          </div>
          <div className="nav-links">
            <button onClick={() => onNavigate('predictions')} className="nav-link">Predictions</button>
            <button onClick={() => onNavigate('history')} className="nav-link nav-link-active">History</button>
            <button onClick={() => onNavigate('season')} className="nav-link">Calendar</button>

          </div>
          <div className="nav-spacer flex-1" />
        </div>
      </nav>

      <main className="page-shell flex-1 px-6 relative">
        <div className="max-w-3xl mx-auto">

          {/* Page header */}
          <div className="mb-10">
            <h1 className="page-title">Prediction History</h1>
            <p className="text-[#A1A1AA] mt-2" style={{ fontSize: '15px' }}>Track record of AI predictions vs actual race results</p>
          </div>

          {/* Coming soon */}
          <HistoryCard>
            <p className="text-[#A1A1AA]" style={{ fontSize: '15px' }}>More race predictions coming each weekend</p>
          </HistoryCard>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] relative" style={{ zIndex: 1, padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 Chicane.ai, All rights reserved.</p>
      </footer>

    </div>
  )
}
