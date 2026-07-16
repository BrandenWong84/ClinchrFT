import type { Transaction, Account, Category } from '../types'

const MOCK_KEY = 'clinchrft:mock:db_v1'

export function isTauriAvailable(): boolean {
  try {
    const winExists = typeof window !== 'undefined'
    const globalExists = typeof globalThis !== 'undefined'
    const winHas = winExists && typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'
    const globalHas = globalExists && typeof (globalThis as any).__TAURI_INTERNALS__ !== 'undefined'
    return !!(winHas || globalHas)
  } catch (e) {
    return false
  }
}

function loadMockState() {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    if (!raw) return { transactions: [], accounts: [], categories: [] }
    return JSON.parse(raw)
  } catch (e) {
    return { transactions: [], accounts: [], categories: [] }
  }
}

function saveMockState(state: any) {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(state))
  } catch (e) {
    // ignore
  }
}

async function ensureMockInitialized() {
  const s = loadMockState()
  if (!Array.isArray(s.transactions)) s.transactions = []
  if (!Array.isArray(s.accounts)) s.accounts = []
  if (!Array.isArray(s.categories)) s.categories = []
  saveMockState(s)
  return s
}

export async function getTransactions(): Promise<Transaction[]> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('get_transactions') as Promise<Transaction[]>
  }

  if (process.env.NODE_ENV === 'production') return []
  const s = await ensureMockInitialized()
  return s.transactions as Transaction[]
}

export async function getAccounts(): Promise<Account[]> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('get_accounts') as Promise<Account[]>
  }

  if (process.env.NODE_ENV === 'production') return []
  const s = await ensureMockInitialized()
  return s.accounts as Account[]
}

export async function getCategories(): Promise<Category[]> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('get_categories') as Promise<Category[]>
  }

  if (process.env.NODE_ENV === 'production') return []
  const s = await ensureMockInitialized()
  return s.categories as Category[]
}

export async function createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('create_transaction', { tx }) as Promise<Transaction>
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Tauri bridge not available')
  const s = await ensureMockInitialized()
  const id = Date.now().toString()
  const created = { ...tx, id }
  s.transactions.push(created)
  saveMockState(s)
  return created
}

export async function updateTransaction(id: string, tx: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('update_transaction', { id, tx }) as Promise<Transaction>
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Tauri bridge not available')
  const s = await ensureMockInitialized()
  const idx = s.transactions.findIndex((t: any) => t.id === id)
  if (idx === -1) throw new Error('not found')
  s.transactions[idx] = { ...s.transactions[idx], ...tx }
  saveMockState(s)
  return s.transactions[idx]
}

export async function deleteTransaction(id: string): Promise<void> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('delete_transaction', { id }) as Promise<void>
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Tauri bridge not available')
  const s = await ensureMockInitialized()
  s.transactions = s.transactions.filter((t: any) => t.id !== id)
  saveMockState(s)
}
