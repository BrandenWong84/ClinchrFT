import { describe, it, expect, beforeEach, vi } from 'vitest'

let mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))

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

describe('tauri-api (dev-safe wrapper)', () => {
  beforeEach(() => {
    // reset module cache between tests
    vi.resetModules()
    mockInvoke.mockReset()
    // provide a fake window + localStorage for node environment
    ;(globalThis as any).window = {}
    ;(globalThis as any).localStorage = makeLocalStorage()
  })

  it('works in browser when Tauri is absent (uses mock)', async () => {
    delete (globalThis as any).__TAURI_INTERNALS__
    const api = await import('../src/services/tauri-api')
    const txs = await api.getTransactions()
    expect(Array.isArray(txs)).toBe(true)

    const created = await api.createTransaction({
      amount: 100,
      date: '2026-01-01',
      description: 'test',
      accountId: 'a',
      categoryId: 'c'
    })
    expect(created).toHaveProperty('id')

    const txs2 = await api.getTransactions()
    expect(txs2.length).toBe(1)
  })

  it('forwards to Tauri invoke when available', async () => {
    ;(globalThis as any).__TAURI_INTERNALS__ = {}
    mockInvoke.mockImplementation(async (cmd: string, args?: any) => {
      if (cmd === 'get_transactions') return [{ id: '1', amount: 50, date: '2026-01-02', description: 'x', accountId: 'a', categoryId: 'c' }]
      if (cmd === 'create_transaction') return { ...args.tx, id: '2' }
      return null
    })

    const api = await import('../src/services/tauri-api')

    const txs = await api.getTransactions()
    expect(mockInvoke).toHaveBeenCalledWith('get_transactions')
    expect(txs.length).toBe(1)

    const created = await api.createTransaction({ amount: 1, date: '2026-01-03', description: 'y', accountId: 'a', categoryId: 'c' })
    expect(mockInvoke).toHaveBeenCalledWith('create_transaction', { tx: expect.any(Object) })
    expect(created.id).toBe('2')
  })

  it('detects Tauri when only globalThis.__TAURI_INTERNALS__ is present', async () => {
    delete (globalThis as any).window
    ;(globalThis as any).__TAURI_INTERNALS__ = {}
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_transactions') return [{ id: 'g', amount: 1, date: '2026-01-01', description: 'g', accountId: 'a', categoryId: 'c' }]
      return null
    })

    const api = await import('../src/services/tauri-api')
    const txs = await api.getTransactions()
    expect(mockInvoke).toHaveBeenCalledWith('get_transactions')
    expect(txs.length).toBe(1)
  })

  it('detects Tauri when only window.__TAURI_INTERNALS__ is present', async () => {
    ;(globalThis as any).window = { __TAURI_INTERNALS__: {} }
    delete (globalThis as any).__TAURI_INTERNALS__
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_transactions') return [{ id: 'w', amount: 2, date: '2026-01-02', description: 'w', accountId: 'a', categoryId: 'c' }]
      return null
    })

    const api = await import('../src/services/tauri-api')
    const txs = await api.getTransactions()
    expect(mockInvoke).toHaveBeenCalledWith('get_transactions')
    expect(txs.length).toBe(1)
  })

  it('isTauriAvailable returns true when only globalThis.__TAURI_INTERNALS__ is present', async () => {
    delete (globalThis as any).window
    ;(globalThis as any).__TAURI_INTERNALS__ = {}
    const api = await import('../src/services/tauri-api')
    expect(api.isTauriAvailable()).toBe(true)
  })

  it('isTauriAvailable returns true when only window.__TAURI_INTERNALS__ is present', async () => {
    ;(globalThis as any).window = { __TAURI_INTERNALS__: {} }
    delete (globalThis as any).__TAURI_INTERNALS__
    const api = await import('../src/services/tauri-api')
    expect(api.isTauriAvailable()).toBe(true)
  })

  it('isTauriAvailable returns false when neither marker is present', async () => {
    delete (globalThis as any).window
    delete (globalThis as any).__TAURI_INTERNALS__
    const api = await import('../src/services/tauri-api')
    expect(api.isTauriAvailable()).toBe(false)
  })
})
