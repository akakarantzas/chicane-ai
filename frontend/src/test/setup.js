import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

class TestIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }

  observe(element) {
    this.callback([{ isIntersecting: true, target: element }], this)
  }

  disconnect() {}
  unobserve() {}
}

globalThis.IntersectionObserver = TestIntersectionObserver

// jsdom has no SVG geometry implementation. Page tests only need the animation
// to mount; actual circuit alignment is verified against the PNG separately.
Object.defineProperties(SVGElement.prototype, {
  getTotalLength: { configurable: true, value: () => 1000 },
  getPointAtLength: { configurable: true, value: (length) => ({ x: length, y: 0 }) },
})

globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
