import { afterEach, expect, test, vi } from 'vitest'
import config from './vite.config'

afterEach(() => vi.unstubAllEnvs())

test('public environment rejects a privileged setting without echoing its value', () => {
  vi.stubEnv('VITE_PRIVATE_TOKEN', 'synthetic-private-value')
  expect(() => config({ mode: 'test' })).toThrow('Keep credentials on the backend')
  try { config({ mode: 'test' }) } catch (error) {
    expect(error.message).not.toContain('synthetic-private-value')
  }
})

test.each(['https://user:synthetic-private-value@example.com', 'https://example.com?token=synthetic-private-value',
  'https://example.com#synthetic-private-value', 'file:///private', 'invalid'])('rejects an unsafe API URL', (url) => {
  vi.stubEnv('VITE_API_BASE_URL', url)
  expect(() => config({ mode: 'test' })).toThrow('without credentials, query, or fragment')
})

test('allows a public API URL and disables production source maps', () => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
  expect(config({ mode: 'test' }).build.sourcemap).toBe(false)
})
