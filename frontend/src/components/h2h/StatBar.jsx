import { D1_COLOR, D2_SECONDARY } from './theme'

function getBarWidths(v1, v2) {
  if (v1 == null || v2 == null) return { w1: 50, w2: 50 }
  if (v1 === v2) return { w1: 50, w2: 50 }
  const sum = v1 + v2
  if (sum === 0) return { w1: 50, w2: 50 }
  return { w1: (v1 / sum) * 100, w2: (v2 / sum) * 100 }
}

function winner(v1, v2, lowerIsBetter) {
  if (v1 == null || v2 == null) return 'tie'
  if (v1 === v2) return 'tie'
  if (lowerIsBetter) return v1 < v2 ? 'd1' : 'd2'
  return v1 > v2 ? 'd1' : 'd2'
}

export default function StatBar({ def, d1Val, d2Val }) {
  const { w1, w2 } = getBarWidths(d1Val, d2Val)
  const win = winner(d1Val, d2Val, def.lowerIsBetter)
  const d1Wins = win === 'd1'
  const d2Wins = win === 'd2'

  return (
    <div role="group" aria-label={def.label} style={{
      backgroundColor: '#1A1A1F',
      borderRadius: '12px',
      padding: '16px 24px',
      marginBottom: '8px',
    }}>
      {/* Label + winner dot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        marginBottom: '4px',
      }}>
        <div style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#A1A1AA',
        }}>
          {def.label}
        </div>
      </div>

      {/* Values + bar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
        {/* D1 value */}
        <div className="num" style={{
          minWidth: '56px',
          textAlign: 'right',
          fontSize: d1Wins ? '28px' : '22px',
          fontWeight: 800,
          color: D1_COLOR,
          flexShrink: 0,
          transition: 'font-size 0.3s ease',
        }}>
          {d1Val ?? '—'}
        </div>

        {/* Center bar */}
        <div style={{ flex: 1, height: '8px', display: 'flex' }}>
          <div
            className="h2h-stat-segment-left"
            style={{
            width: `${w1}%`,
            borderRadius: '99px',
            transition: 'width 0.4s ease',
          }}
          />
          <div
            className="h2h-stat-segment-hologram"
            style={{
              width: `${w2}%`,
              borderRadius: '99px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* D2 value */}
        <div className="num" style={{
          minWidth: '56px',
          textAlign: 'left',
          fontSize: d2Wins ? '28px' : '22px',
          fontWeight: 800,
          color: D2_SECONDARY,
          textShadow: d2Wins ? `0 0 8px rgba(244,250,255,.28), 0 0 16px rgba(127,228,255,.2)` : 'none',
          flexShrink: 0,
          transition: 'font-size 0.3s ease',
        }}>
          {d2Val ?? '—'}
        </div>
      </div>
    </div>
  )
}
