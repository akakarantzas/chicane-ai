import { D1_COLOR, D1_BACKGROUND_OVERLAY } from './theme'

export default function ComparisonLoading() {
  return (
    <div
      role="status"
      aria-label="Fetching real F1 data"
      style={{
        marginTop: '40px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '18px',
      }}
    >
      <div style={{
        display: 'flex', gap: '6px', padding: '10px', borderRadius: '10px',
        background: '#0C0C0E', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: '4px',
            padding: '8px 6px', borderRadius: '4px',
            background: '#05050A', border: '1px solid rgba(255,255,255,0.04)',
          }}>
            {[0, 1].map((j) => (
              <span key={j} className="f1-light" style={{
                width: '14px', height: '14px', borderRadius: '999px',
                background: D1_BACKGROUND_OVERLAY, display: 'block',
                animation: `f1-light-seq 2.6s ease-in-out ${i * 0.28}s infinite`,
              }} />
            ))}
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        fontSize: '11px', fontWeight: 800, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: '#A1A1AA',
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '99px',
          background: D1_COLOR,
          animation: 'f1-pulse 1s ease-in-out infinite',
        }} />
        Fetching real F1 data...
      </div>

      <style>{`
        @keyframes f1-light-seq {
          0%, 8%    { background: rgba(225,6,0,0.08); box-shadow: none; }
          12%, 72%  { background: var(--red-driver); box-shadow: 0 0 12px var(--red-glow); }
          76%, 100% { background: rgba(225,6,0,0.08); box-shadow: none; }
        }
        @keyframes f1-pulse {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .f1-light { animation: none !important; background: var(--red-driver) !important; }
        }
      `}</style>
    </div>
  )
}
