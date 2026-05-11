import { useState } from 'react'

import useIsMobile from '../hooks/useIsMobile'

const NAV_ITEMS = [
  { page: 'predictions', label: 'Predictions' },
  { page: 'h2h', label: 'H2H' },
  { page: 'history', label: 'History', history: true },
  { page: 'season', label: 'Calendar' },
  { page: 'contact', label: 'Contact' },
]

function navLinkClass(item, activePage) {
  const classes = ['nav-link']
  if (item.history) classes.push('nav-link-history')
  if (item.page === activePage) {
    classes.push('nav-link-active')
    if (item.history) classes.push('nav-link-active-history')
  }
  return classes.join(' ')
}

function inactiveMobileStyle(item, activePage) {
  return item.page === activePage ? {} : { color: '#A1A1AA' }
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

function MobileNavDropdown({ activePage, onNavigate }) {
  return (
    <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.page}
          onClick={() => onNavigate?.(item.page)}
          className={navLinkClass(item, activePage)}
          style={{ width: '100%', textAlign: 'left', padding: '12px 4px', ...inactiveMobileStyle(item, activePage) }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function AppNav({ activePage, onNavigate, variant }) {
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className={`app-nav${variant === 'hero' ? ' hero-nav' : ''}`} style={{ padding: isMobile ? '0 16px' : '0 24px' }}>
      <div className="app-nav-inner" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: '52px', gap: '16px' }}>
        <div className="brand-wrap" style={{ flex: isMobile ? '0 1 auto' : 1 }}>
          <button onClick={() => onNavigate?.('home')} className="brand-button" aria-label="Go to home">
            <img src="/logo-mark.png" alt="" className="brand-logo" />
            <span className="brand-wordmark">ChicaneAI</span>
          </button>
        </div>

        <div className="nav-links" style={{ display: isMobile ? 'none' : 'flex' }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.page} onClick={() => onNavigate?.(item.page)} className={navLinkClass(item, activePage)}>
              {item.label}
            </button>
          ))}
        </div>

        {isMobile && (
          <HamburgerButton
            isOpen={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          />
        )}

        <div className="nav-spacer flex-1" style={{ display: isMobile ? 'none' : 'block' }} />
      </div>
      {isMobile && isMenuOpen && <MobileNavDropdown activePage={activePage} onNavigate={onNavigate} />}
    </nav>
  )
}
