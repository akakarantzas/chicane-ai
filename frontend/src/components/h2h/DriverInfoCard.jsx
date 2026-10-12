import { DRIVER_MAP, getTeamColor } from '../../data/drivers'
import { HEADING_TEXT_COLOR } from './theme'

export default function DriverInfoCard({ abbrev, teamColor }) {
  const driver = DRIVER_MAP[abbrev] ?? { abbrev, fullName: abbrev, team: '—', number: '—' }
  const avatarColor = teamColor ?? getTeamColor(driver.team)

  return (
    <div
      className="h2h-driver-card"
      style={{ borderTop: `2px solid ${avatarColor}` }}
    >
      {/* Initials circle */}
      <div
        className="transition-all duration-500"
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${avatarColor} 58%, #FFFFFF) 0%, ${avatarColor} 54%, color-mix(in srgb, ${avatarColor} 72%, #05050A) 100%)`,
          boxShadow: `0 0 9px color-mix(in srgb, ${avatarColor} 32%, transparent), 0 0 18px color-mix(in srgb, ${avatarColor} 14%, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '24px', letterSpacing: '0.02em' }}>
          {abbrev}
        </span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: HEADING_TEXT_COLOR, marginTop: '12px' }}>{driver.fullName}</div>
      <div style={{ fontSize: '14px', color: '#A1A1AA', marginTop: '4px' }}>{driver.team}</div>
      <div
        className="num"
        style={{
          fontSize: '18px',
          color: avatarColor,
          fontWeight: 700,
          marginTop: '6px',
          transition: 'color 0.5s ease, text-shadow 0.5s ease',
          textShadow: `0 0 10px color-mix(in srgb, ${avatarColor} 28%, transparent)`,
        }}
      >
        #{driver.number}
      </div>
    </div>
  )
}
