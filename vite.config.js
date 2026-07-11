import { defineConfig } from 'vite'

export default ({ command }) =>
  defineConfig({
    // Use `public` as root only for production builds so tests/dev use repository root
    root: command === 'build' ? 'public' : undefined,
  })
