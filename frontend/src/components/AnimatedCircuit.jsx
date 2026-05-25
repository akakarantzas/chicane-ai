import { useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION = 5600

export default function AnimatedCircuit({
  path,
  viewBox = '0 0 800 420',
  duration = DEFAULT_DURATION,
  showPath = true,
  showDebugPath = false,
  pathVariant = 'glow',
  preserveAspectRatio = 'none',
  className = '',
}) {
  const pathRef = useRef(null)
  const [marker, setMarker] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const pathNode = pathRef.current
    if (!pathNode) return undefined

    const totalLength = pathNode.getTotalLength()
    let animationFrame
    let startTime
    setMarker(pathNode.getPointAtLength(0))

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = (elapsed % duration) / duration
      const currentLength = progress * totalLength
      const point = pathNode.getPointAtLength(currentLength)

      setMarker({ x: point.x, y: point.y })
      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [duration, path])

  return (
    <svg
      viewBox={viewBox}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      preserveAspectRatio={preserveAspectRatio}
      fill="none"
      role="img"
      aria-label="Animated Miami GP circuit marker"
    >
      {showPath && (
        pathVariant === 'plain' ? (
          <path
            d={path}
            stroke="#FFF5F5"
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(255,245,245,0.22))',
            }}
          />
        ) : (
          <>
            <path
              d={path}
              stroke="rgba(232, 0, 45, 0.22)"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{ filter: 'blur(7px)' }}
            />
            <path
              d={path}
              stroke="rgba(255, 245, 245, 0.24)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(255,245,245,0.28)) drop-shadow(0 0 12px rgba(232,0,45,0.42))',
              }}
            />
            <path
              d={path}
              stroke="#FFF5F5"
              strokeWidth="4.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                filter: 'drop-shadow(0 0 3px rgba(255,245,245,0.42)) drop-shadow(0 0 7px rgba(232,0,45,0.72)) drop-shadow(0 0 15px rgba(232,0,45,0.38))',
              }}
            />
          </>
        )
      )}
      {showDebugPath && (
        <path
          d={path}
          stroke="red"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {/* Geometry path used for getTotalLength/getPointAtLength only. */}
      <path
        ref={pathRef}
        d={path}
        stroke="transparent"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <g transform={`translate(${marker.x} ${marker.y})`}>
        <circle r="14" fill="rgba(232, 0, 45, 0.14)" />
        <circle r="9" fill="rgba(232, 0, 45, 0.32)" />
        <circle
          r="5.8"
          fill="#E8002D"
          stroke="#E8002D"
          strokeWidth="1.3"
        />
        <circle
          r="2.8"
          fill="#E8002D"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(232,0,45,0.55))',
          }}
        />
      </g>
    </svg>
  )
}
