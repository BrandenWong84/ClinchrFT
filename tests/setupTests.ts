import { beforeEach } from 'vitest'

// Provide a stable localStorage implementation for the Node test environment
function makeLocalStorage() {
  let store: Record<string, string> = {}
  return {
    getItem(key: string) {
      return store[key] ?? null
    },
    setItem(key: string, value: string) {
      store[key] = String(value)
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      store = {}
    }
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  ;(globalThis as any).localStorage = makeLocalStorage()
}

// Polyfill ResizeObserver for recharts in test environment
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Ensure storage is cleared before each test
beforeEach(() => {
  ;(globalThis as any).localStorage.clear()
})
