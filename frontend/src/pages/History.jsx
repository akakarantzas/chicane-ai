
export default function History({ onNavigate }) {
  return (
    <div
      className="relative min-h-screen text-[#F4F4F5] flex flex-col"
      style={{
        backgroundImage: 'url(/f1red.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: '#0C0C0E',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(12,12,14,0.72) 0%, rgba(12,12,14,0.88) 50%, rgba(12,12,14,0.97) 100%)', zIndex: 0 }} />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/[0.06] px-6" style={{ backgroundColor: 'transparent' }}>
        <div className="flex items-center h-16 max-w-7xl mx-auto">
          <div className="flex-1 flex items-center">
            <button onClick={() => onNavigate('home')} className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/logo-mark.png" alt="" style={{ height: '60px', width: '60px', objectFit: 'contain', marginRight: '-14px' }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontStyle: 'italic', letterSpacing: '-0.05em', fontSize: '1.9rem', color: '#F4F4F5' }}>Chicane.ai</span>
            </button>
          </div>
          <div className="flex items-center gap-8 text-[#A1A1AA]" style={{ fontSize: '1.2rem', fontWeight: 500 }}>
            <button onClick={() => onNavigate('predictions')} className="hover:text-[#F4F4F5] transition-colors">Predictions</button>
            <button onClick={() => onNavigate('history')} className="text-[#F4F4F5]">History</button>
            <button onClick={() => onNavigate('season')} className="hover:text-[#F4F4F5] transition-colors">Calendar</button>

          </div>
          <div className="flex-1" />
        </div>
      </nav>

      <main className="flex-1 px-6 pb-12 relative" style={{ zIndex: 1, paddingTop: '64px' }}>
        <div className="max-w-3xl mx-auto">

          {/* Page header */}
          <div className="mb-10">
            <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.02em' }}>Prediction History</h1>
            <p className="text-[#A1A1AA] mt-2" style={{ fontSize: '15px' }}>Track record of AI predictions vs actual race results</p>
          </div>

          {/* Coming soon */}
          <div className="border border-dashed border-white/[0.06] rounded-xl px-6 py-10 text-center">
            <p className="text-[#A1A1AA]" style={{ fontSize: '15px' }}>More race predictions coming each weekend</p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] relative" style={{ zIndex: 1 }} style={{ padding: '28px 32px' }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>© 2026 Chicane.ai, All rights reserved.</p>
      </footer>

    </div>
  )
}
