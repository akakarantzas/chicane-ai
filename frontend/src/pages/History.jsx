const PREDICTED = ['Verstappen', 'Leclerc', 'Norris', 'Piastri']
const ACTUAL = [
  { driver: 'Norris',      position: 'P1' },
  { driver: 'Leclerc',     position: 'P2' },
  { driver: 'Piastri',     position: 'P3' },
  { driver: 'Verstappen',  position: 'P4' },
]

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
            <button onClick={() => onNavigate('history')} className="text-[#F4F4F5]">History</button>
            <button onClick={() => onNavigate('season')} className="hover:text-[#F4F4F5] transition-colors">Season</button>
            <a href="#how-it-works" className="hover:text-[#F4F4F5] transition-colors">How it works</a>
          </div>
          <div className="flex-1" />
        </div>
      </nav>

      <main className="flex-1 px-6 pb-12 relative" style={{ paddingTop: '80px', zIndex: 1 }}>
        <div className="max-w-3xl mx-auto">

          {/* Page header */}
          <div className="mb-10">
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Prediction History</h1>
            <p className="text-[#A1A1AA] mt-2" style={{ fontSize: '1.1rem' }}>Track record of AI predictions vs actual race results</p>
          </div>

          {/* Monaco 2025 card */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-6 mb-6">

            {/* Card header */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Monaco Grand Prix 2025</h2>
                <p className="text-[#A1A1AA] mt-0.5" style={{ fontSize: '1rem' }}>May 25, 2025</p>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-green-900/40 text-green-400 font-medium px-2.5 py-1 rounded-full border border-green-800/50 shrink-0" style={{ fontSize: '0.85rem' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Verified
              </span>
            </div>

            <p className="text-green-400 mb-6" style={{ fontSize: '1rem' }}>All 4 top finishers correctly identified</p>

            {/* Comparison table */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="font-semibold text-[#A1A1AA] uppercase mb-3" style={{ fontSize: '0.85rem', letterSpacing: '0.12em' }}>
                  Predicted top 4
                </p>
                <ol className="space-y-2">
                  {PREDICTED.map((driver, i) => (
                    <li key={driver} className="flex items-center gap-2.5">
                      <span className="text-[#A1A1AA] w-3 shrink-0" style={{ fontSize: '0.85rem' }}>{i + 1}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>{driver}</span>
                      <span className="text-green-400 ml-auto" style={{ fontSize: '1rem' }}>✓</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="font-semibold text-[#A1A1AA] uppercase mb-3" style={{ fontSize: '0.85rem', letterSpacing: '0.12em' }}>
                  Actual result
                </p>
                <ol className="space-y-2">
                  {ACTUAL.map(({ driver, position }) => (
                    <li key={driver} className="flex items-center gap-2.5">
                      <span className="font-medium text-[#A1A1AA] w-6 shrink-0" style={{ fontSize: '0.85rem' }}>{position}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>{driver}</span>
                      <span className="text-green-400 ml-auto" style={{ fontSize: '1rem' }}>✓</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <p className="text-[#A1A1AA] border-t border-white/[0.06] pt-4 mb-5" style={{ fontSize: '0.9rem' }}>
              Group prediction — all 4 drivers correctly identified, finishing order differs
            </p>

            {/* Summary bar */}
            <div className="flex items-center justify-between bg-[#27272A]/60 rounded-lg px-4 py-3">
              <span className="font-medium text-green-400" style={{ fontSize: '1rem' }}>4/4 drivers correctly identified</span>
              <span className="text-[#A1A1AA]" style={{ fontSize: '1rem' }}>Group prediction accuracy: 100%</span>
            </div>
          </div>

          {/* Coming soon */}
          <div className="border border-dashed border-white/[0.06] rounded-xl px-6 py-10 text-center">
            <p className="text-[#A1A1AA]" style={{ fontSize: '1rem' }}>More race predictions coming each weekend</p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] relative" style={{ zIndex: 1 }} style={{ padding: '28px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#A1A1AA' }}>Chicane.ai</span>
          <span style={{ fontSize: '1rem', color: '#A1A1AA' }}>Built by Apostolos Kakarantzas</span>
        </div>
      </footer>

    </div>
  )
}
