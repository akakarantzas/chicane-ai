import { useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION = 5600

export default function AnimatedCircuit({
  path,
  viewBox = '0 0 800 420',
  duration = DEFAULT_DURATION,
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
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      fill="none"
      role="img"
      aria-label="Animated Miami GP circuit marker"
    >
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
          stroke="rgba(255, 107, 53, 0.78)"
          strokeWidth="1.3"
        />
        <circle
          r="2.8"
          fill="#FF6B35"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(232,0,45,0.55))',
          }}
        />
      </g>
    </svg>
  )
}
