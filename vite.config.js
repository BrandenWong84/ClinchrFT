import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default () =>
  defineConfig({
    root: 'public',
    plugins: [react()],
    server: {
      watch: {
        ignored: ['**/src-tauri/target/**']
      }
    }
    ,
    test: {
      include: ['../tests/**/*.{test,spec}.{ts,tsx,js,jsx}']
    }
  })