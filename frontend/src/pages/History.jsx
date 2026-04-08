const PREDICTED = ['Verstappen', 'Leclerc', 'Norris', 'Piastri']
const ACTUAL = [
  { driver: 'Norris',      position: 'P1' },
  { driver: 'Leclerc',     position: 'P2' },
  { driver: 'Piastri',     position: 'P3' },
  { driver: 'Verstappen',  position: 'P4' },
]

export default function History({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="font-bold text-lg tracking-tight">Chicane.ai</span>
          </button>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <button onClick={() => onNavigate('predictions')} className="hover:text-white transition-colors">
              Predictions
            </button>
            <button onClick={() => onNavigate('history')} className="text-white font-medium">
              History
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">

          {/* Page header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight">Prediction History</h1>
            <p className="text-gray-400 mt-2">Track record of AI predictions vs actual race results</p>
          </div>

          {/* Monaco 2025 card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">

            {/* Card header */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-semibold">Monaco Grand Prix 2025</h2>
                <p className="text-sm text-gray-500 mt-0.5">May 25, 2025</p>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-green-900/40 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full border border-green-800/50 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Verified
              </span>
            </div>

            <p className="text-sm text-green-400 mb-6">All 4 top finishers correctly identified</p>

            {/* Comparison table */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">
                  Predicted top 4
                </p>
                <ol className="space-y-2">
                  {PREDICTED.map((driver, i) => (
                    <li key={driver} className="flex items-center gap-2.5">
                      <span className="text-xs text-gray-600 w-3 shrink-0">{i + 1}</span>
                      <span className="text-sm">{driver}</span>
                      <span className="text-green-400 text-sm ml-auto">✓</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">
                  Actual result
                </p>
                <ol className="space-y-2">
                  {ACTUAL.map(({ driver, position }) => (
                    <li key={driver} className="flex items-center gap-2.5">
                      <span className="text-xs font-medium text-gray-500 w-6 shrink-0">{position}</span>
                      <span className="text-sm">{driver}</span>
                      <span className="text-green-400 text-sm ml-auto">✓</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <p className="text-xs text-gray-600 border-t border-gray-800 pt-4 mb-5">
              Group prediction — all 4 drivers correctly identified, finishing order differs
            </p>

            {/* Summary bar */}
            <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-green-400">4/4 drivers correctly identified</span>
              <span className="text-sm text-gray-400">Group prediction accuracy: 100%</span>
            </div>
          </div>

          {/* Coming soon */}
          <div className="border border-dashed border-gray-800 rounded-xl px-6 py-10 text-center">
            <p className="text-gray-600 text-sm">More race predictions coming each weekend</p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <span className="font-semibold text-gray-500">Chicane.ai</span>
          <span>Built by Apostolos Kakarantzas</span>
        </div>
      </footer>

    </div>
  )
}
