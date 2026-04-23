import { useEffect, useState } from 'react'

const EMAIL = 'a.kakarantzas@acg.edu'
const FEATURE_CHIPS = [
  'Lap time comparison',
  'Fantasy optimizer',
  'Live race updates',
  'Driver career stats',
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
      <button onClick={() => onNavigate('h2h')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>H2H</button>
      <button onClick={() => onNavigate('history')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>History</button>
      <button onClick={() => onNavigate('season')} className="nav-link" style={{ width: '100%', textAlign: 'left', padding: '12px 4px', color: '#A1A1AA' }}>Calendar</button>
      <button onClick={() => onNavigate('contact')} className="nav-link nav-link-active" style={{ width: '100%', textAlign: 'left', padding: '12px 4px' }}>Contact</button>
    </div>
  )
}

export default function Contact({ onNavigate }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  return (
    <div className="contact-page min-h-screen text-[#F4F4F5] flex flex-col">
      <nav className="app-nav" style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
        <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px', gap: '16px' }}>
          <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
            <button onClick={() => onNavigate('home')} className="brand-button">
              <img src="/logo-mark.png" alt="" className="brand-logo" />
              <span className="brand-wordmark">ChicaneAI</span>
            </button>
          </div>
          <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
            <button onClick={() => onNavigate('predictions')} className="nav-link">Predictions</button>
            <button onClick={() => onNavigate('h2h')} className="nav-link">H2H</button>
            <button onClick={() => onNavigate('history')} className="nav-link">History</button>
            <button onClick={() => onNavigate('season')} className="nav-link">Calendar</button>
            <button onClick={() => onNavigate('contact')} className="nav-link nav-link-active">Contact</button>
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

      <main className="contact-shell">
        <header className="contact-header">
          <div className="contact-header-brand" aria-label="ChicaneAI">
            <img src="/logo-mark.png" alt="" className="brand-logo" />
            <span className="brand-wordmark">ChicaneAI</span>
          </div>
          <h1>Get in touch</h1>
          <p>Questions, feedback, or ideas for ChicaneAI.</p>
        </header>

        <section className="contact-stack" aria-label="Contact options">
          <article className="contact-card contact-card-row">
            <div className="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4.75 6.75h14.5v10.5H4.75V6.75Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="m5.5 7.5 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="contact-card-copy">
              <span>Email</span>
              <p>{EMAIL}</p>
            </div>
            <button className="contact-action" onClick={copyEmail}>
              {copied ? 'Copied' : 'Copy email'}
            </button>
          </article>

          <article className="contact-card contact-feature-card">
            <div className="contact-feature-heading">
              <span className="contact-status-dot" aria-hidden="true" />
              <div>
                <h2>Feature requests</h2>
                <p>Suggest improvements, new F1 tools, or prediction views that would make the product more useful.</p>
              </div>
            </div>
            <div className="contact-chip-grid">
              {FEATURE_CHIPS.map((chip) => (
                <button key={chip} className="contact-chip" type="button">
                  {chip}
                </button>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
