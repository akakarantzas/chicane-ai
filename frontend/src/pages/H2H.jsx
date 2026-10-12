import { useState } from 'react'

import AppNav from '../components/AppNav'
import DriverDropdown from '../components/h2h/DriverDropdown'
import DriverInfoCard from '../components/h2h/DriverInfoCard'
import ComparisonLoading from '../components/h2h/ComparisonLoading'
import ComparisonResults from '../components/h2h/ComparisonResults'
import { D1_COLOR, HEADING_TEXT_COLOR } from '../components/h2h/theme'
import { DRIVERS, DRIVER_MAP, getTeamColor } from '../data/drivers'
import useIsMobile from '../hooks/useIsMobile'
import useH2HComparison from '../hooks/useH2HComparison'

export default function H2H({ onNavigate }) {
  const isMobile = useIsMobile()
  const [btnHovered, setBtnHovered] = useState(false)

  const {
    driver1, driver2, selectDriver1, selectDriver2, compare,
    loading, error, result, prediction, predictionLoading, predictionError,
  } = useH2HComparison()

  return (
    <div
      className="page-bg"
      style={{
        minHeight: '100vh',
        color: HEADING_TEXT_COLOR,
        backgroundImage: 'url(/h2h-bg.png)',
        position: 'relative',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(12,12,14,0.88)', zIndex: 0 }} />

      {/* ── Pulse keyframes ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,0,60,0.4); }
          50%       { box-shadow: 0 0 0 12px rgba(255,0,60,0); }
        }
      `}</style>

      {/* ── Navbar ── */}
      <AppNav activePage="h2h" onNavigate={onNavigate} />

      {/* ── Main content ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px', position: 'relative', zIndex: 1 }}>
        <section style={{ paddingTop: '80px', paddingBottom: '80px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: HEADING_TEXT_COLOR, margin: 0, lineHeight: 1.1 }}>
              Head to Head
            </h1>
            <p style={{ fontSize: '15px', color: '#A1A1AA', marginTop: '10px', marginBottom: 0 }}>
              Compare F1 drivers using real performance data
            </p>
            <div style={{ width: '60px', height: '3px', backgroundColor: D1_COLOR, marginTop: '8px', borderRadius: '2px' }} />
          </div>

          {/* ── Driver selection row ── */}
          <div className="h2h-matchup-grid h2h-selector-grid">

            {/* Driver 1 column */}
            <div className="h2h-selector-cell">
              <DriverDropdown
                value={driver1}
                label="Select first driver"
                options={DRIVERS}
                onChange={selectDriver1}
              />
            </div>

            {/* Driver 2 column */}
            <div className="h2h-selector-cell">
              <DriverDropdown
                value={driver2}
                label="Select second driver"
                options={DRIVERS}
                onChange={selectDriver2}
              />
            </div>

          </div>

          {/* ── Driver info cards ── */}
          <div className="h2h-matchup-grid h2h-card-grid">
            <DriverInfoCard abbrev={driver1} teamColor={getTeamColor(DRIVER_MAP[driver1]?.team)} />
            <div className="h2h-vs-circle">
              VS
            </div>
            <DriverInfoCard abbrev={driver2} teamColor={getTeamColor(DRIVER_MAP[driver2]?.team)} />
          </div>

          {/* ── Compare button ── */}
          <button
            onClick={compare}
            disabled={loading}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: D1_COLOR,
              color: '#fff',
              border: '1px solid var(--red-border)',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              boxShadow: btnHovered && !loading
                ? '0 3px 8px rgba(225,6,0,0.18)'
                : 'none',
              transition: 'background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
            }}
          >
            {loading ? <span className="loading-dots">Loading</span> : 'Compare'}
          </button>

          {/* ── States ── */}
          {loading && <ComparisonLoading />}

          {error && !loading && (
            <div style={{ textAlign: 'center', color: D1_COLOR, fontSize: '15px', marginTop: '40px' }}>
              {error}
            </div>
          )}

          {!loading && !error && !result && (
            <div style={{
              background:
                'linear-gradient(145deg, rgba(244,244,245,0.018), rgba(244,244,245,0.006) 42%, rgba(12,12,14,0.18)), rgba(18,18,22,0.38)',
              border: '1px solid rgba(255,0,60,0.2)',
              boxShadow: '0 14px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(244,244,245,0.045)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginTop: '24px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}>
              <img src="/white-f1-car.png" alt="F1 car" style={{ width: '120px', height: 'auto', opacity: 0.6 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: HEADING_TEXT_COLOR, margin: '0' }}>
                  Pick your drivers
                </div>
                <div style={{ fontSize: '13px', color: '#A1A1AA', margin: '4px 0 0 0' }}>
                  Select any two drivers and hit Compare
                </div>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {!loading && !error && result && (
            <ComparisonResults
              result={result}
              prediction={prediction}
              driver1={driver1}
              driver2={driver2}
              predictionLoading={predictionLoading}
              predictionError={predictionError}
            />
          )}

        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6" style={{ padding: '28px 32px', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '14px', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>
          © 2026 ChicaneAI, All rights reserved.
        </p>
      </footer>

    </div>
  )
}