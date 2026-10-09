import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Every VITE_ value is public. Keep the allowlist limited to the API origin.
  const publicEnv = loadEnv(mode, process.cwd(), 'VITE_')
  if (Object.keys(publicEnv).some((key) => key !== 'VITE_API_BASE_URL')) {
    throw new Error('Unexpected public environment variable. Keep credentials on the backend.')
  }
  if (publicEnv.VITE_API_BASE_URL) {
    let url
    try { url = new URL(publicEnv.VITE_API_BASE_URL) } catch {
      throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.')
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.')
    }
  }
  return {
    plugins: [react()],
    build: { sourcemap: false },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  }
})
