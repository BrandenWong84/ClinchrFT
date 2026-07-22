import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.*', 'tests/**/*.spec.*', 'src/**/*.test.*', 'src/**/*.spec.*'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    setupFiles: ['tests/setupTests.ts'],
  },
})
