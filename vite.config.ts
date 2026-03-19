/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Injects the build timestamp into dist/sw.js so every deploy busts the SW cache automatically.
// The source file (public/sw.js) uses the placeholder __SW_BUILD__ which is never executed directly.
const swVersionPlugin = {
  name: 'sw-version-inject',
  closeBundle() {
    const swPath = resolve(__dirname, 'dist/sw.js')
    try {
      const content = readFileSync(swPath, 'utf8')
      writeFileSync(swPath, content.replace('__SW_BUILD__', Date.now().toString()))
    } catch {
      // sw.js not present (e.g. during test runs) — safe to skip
    }
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    swVersionPlugin,
    // Upload source maps to Sentry in CI builds (when auth token is present)
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [sentryVitePlugin({ authToken: process.env.SENTRY_AUTH_TOKEN })]
      : []),
  ],
  build: {
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
