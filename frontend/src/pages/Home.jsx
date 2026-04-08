const TOP3 = [
  { driver: 'Verstappen', probability: 0.5 },
  { driver: 'Leclerc', probability: 0.47 },
  { driver: 'Norris', probability: 0.28 },
]

const BAR_COLORS = ['#ef4444', '#f97316', '#eab308']

export default function Home({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="font-bold text-lg tracking-tight">Chicane.ai</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <button
              onClick={() => onNavigate('predictions')}
              className="hover:text-white transition-colors"
            >
              Predictions
            </button>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a
              href="#"
              className="text-white font-medium hover:text-red-400 transition-colors"
            >
              Pro
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 bg-green-900/40 text-green-400 text-xs font-medium px-3 py-1 rounded-full border border-green-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
            Correctly identified all 4 top finishers at Monaco 2025
          </span>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Race intelligence, before<br className="hidden sm:block" /> the lights go out.
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed">
            AI-powered F1 predictions updated every race weekend.
            <br className="hidden sm:block" />
            Built on real race data, not guesswork.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('predictions')}
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              See predictions
            </button>
            <a
              href="#how-it-works"
              className="border border-gray-700 hover:border-gray-500 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-t border-b border-gray-800 py-8 px-6">
        <div className="max-w-2xl mx-auto grid grid-cols-3 divide-x divide-gray-800 text-center">
          <div className="px-4">
            <p className="text-3xl font-bold text-white">74%</p>
            <p className="text-xs text-gray-500 mt-1">Top-3 prediction accuracy</p>
          </div>
          <div className="px-4">
            <p className="text-3xl font-bold text-white">8</p>
            <p className="text-xs text-gray-500 mt-1">Races predicted</p>
          </div>
          <div className="px-4">
            <p className="text-xl font-bold text-white">Monaco 2025</p>
            <p className="text-xs text-gray-500 mt-1">Breakthrough prediction</p>
          </div>
        </div>
      </section>

      {/* Preview section */}
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-semibold tracking-widest text-gray-500 uppercase mb-6">
            Latest prediction
          </h2>

          <ol className="space-y-3 mb-8">
            {TOP3.map((p, i) => {
              const pct = (p.probability * 100).toFixed(0)
              const barWidth = `${(p.probability / TOP3[0].probability) * 100}%`
              return (
                <li key={p.driver} className="flex items-center gap-4">
                  <span className="w-5 text-right text-sm font-semibold text-gray-500 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{p.driver}</span>
                      <span className="text-sm tabular-nums text-gray-400">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
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
            className="w-full border border-gray-700 hover:border-gray-500 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            View full predictions →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <span className="font-semibold text-gray-500">Chicane.ai</span>
          <span>Built by Apostolos Kakarantzas</span>
        </div>
      </footer>

    </div>
  )
}
