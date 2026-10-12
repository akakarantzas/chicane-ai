import { useEffect, useRef, useState } from 'react'

export function useVisibleOnce(threshold = 0.35) {
  const elementRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold })

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return [elementRef, isVisible]
}

export function useAnimatedPercentage(target, { delay = 0, duration = 2880, active = true } = {}) {
  const [displayPct, setDisplayPct] = useState(0)

  useEffect(() => {
    setDisplayPct(0)
    if (!active) return undefined

    let frameId = null
    const timeoutId = window.setTimeout(() => {
      const start = performance.now()
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1)
        setDisplayPct(target * (1 - Math.pow(1 - progress, 3)))
        if (progress < 1) frameId = requestAnimationFrame(tick)
      }
      frameId = requestAnimationFrame(tick)
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [active, delay, duration, target])

  return displayPct
}
