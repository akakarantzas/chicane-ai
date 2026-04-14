import { useEffect } from 'react'

const KEYFRAMES = `
@keyframes heartbeat-ping {
  0%   { transform: scale(1);    opacity: 0.4; }
  100% { transform: scale(1.15); opacity: 0;   }
}
`

let styleInjected = false
function injectStyle() {
  if (styleInjected) return
  const el = document.createElement('style')
  el.textContent = KEYFRAMES
  document.head.appendChild(el)
  styleInjected = true
}

export default function ButtonHeartbeatEffectDemo({ onClick, children = 'See predictions' }) {
  useEffect(() => { injectStyle() }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, borderRadius: '8px',
        border: '1px solid rgba(232,0,45,0.6)', backgroundColor: 'transparent',
        animation: 'heartbeat-ping 2s ease-out infinite',
      }} />
      <button
        onClick={onClick}
        style={{
          position: 'relative', zIndex: 1,
          height: '44px', padding: '0 20px', borderRadius: '8px',
          fontSize: '15px', fontWeight: 600,
          backgroundColor: '#E8002D', color: 'white', border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#ff1a3d'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 10px 24px rgba(232,0,45,0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#E8002D'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {children}
      </button>
    </div>
  )
}
