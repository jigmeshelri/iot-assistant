import { defineConfig } from 'vitest/config'
import react from '@astrojs/react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/components/islands/**', 'src/lib/**'],
      exclude: ['src/test/**', 'src/env.d.ts'],
      thresholds: {
        lines: 80,
      },
    },
  },
})
