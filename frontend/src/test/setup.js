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

globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
