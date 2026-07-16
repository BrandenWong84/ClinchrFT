import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default () =>
  defineConfig({
    plugins: [react()],
    server: {
      watch: {
        ignored: ['**/src-tauri/target/**']
      },
      fs: {
        allow: ['..']
      }
    }
    ,
    test: {
      include: ['tests/**/*.{test,spec}.{ts,tsx,js,jsx}']
    }
  })