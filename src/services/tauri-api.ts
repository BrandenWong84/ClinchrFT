import type { Transaction, Account, Category } from '../types/index'

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

// Dates: use ISO-8601 date strings (YYYY-MM-DD) for `startDate`/`endDate` in filters.
export type TransactionsFilter = {
  startDate?: string
  endDate?: string
  accountId?: string
  categoryId?: string
  minAmountCents?: number
  maxAmountCents?: number
  q?: string
  sortBy?: 'date' | 'amount'
  sortDir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type PaginatedTransactions = {
  items: Transaction[]
  total: number
  limit: number
  offset: number
}

export async function getTransactionsPaged(filters?: TransactionsFilter): Promise<PaginatedTransactions> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    if (typeof filters === 'undefined') {
      return core.invoke('get_transactions') as Promise<PaginatedTransactions>
    }
    return core.invoke('get_transactions', { filter: filters }) as Promise<PaginatedTransactions>
  }

  if (process.env.NODE_ENV === 'production') return { items: [], total: 0, limit: 0, offset: 0 }
  const s = await ensureMockInitialized()
  return { items: s.transactions as Transaction[], total: (s.transactions || []).length, limit: filters?.limit ?? (s.transactions || []).length, offset: filters?.offset ?? 0 }
}

export async function getTransactions(): Promise<Transaction[]> {
  const paged = await getTransactionsPaged()
  if (Array.isArray(paged)) return paged as Transaction[]
  return (paged as PaginatedTransactions).items
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

export async function createAccount(name: string, notes?: string): Promise<Account> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('create_account', { name, notes }) as Promise<Account>
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Tauri bridge not available')
  const s = await ensureMockInitialized()
  const id = Date.now().toString()
  const created = { id, name }
  s.accounts.push(created)
  saveMockState(s)
  return created
}

export async function createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    const sanitized = { ...tx, categoryId: (tx as any).categoryId === '' ? undefined : (tx as any).categoryId }
    return core.invoke('create_transaction', { tx: sanitized }) as Promise<Transaction>
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Tauri bridge not available')
  const s = await ensureMockInitialized()
  const id = Date.now().toString()
  const sanitized = { ...tx, categoryId: (tx as any).categoryId === '' ? undefined : (tx as any).categoryId }
  const created = { ...sanitized, id }
  s.transactions.push(created)
  saveMockState(s)
  return created
}

export async function updateTransaction(id: string, tx: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    const sanitized = { ...tx } as any
    if (sanitized.categoryId === '') sanitized.categoryId = undefined
    return core.invoke('update_transaction', { id, tx: sanitized }) as Promise<Transaction>
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Tauri bridge not available')
  const s = await ensureMockInitialized()
  const idx = s.transactions.findIndex((t: any) => t.id === id)
  if (idx === -1) throw new Error('not found')
  const sanitized = { ...tx } as any
  if (sanitized.categoryId === '') sanitized.categoryId = undefined
  s.transactions[idx] = { ...s.transactions[idx], ...sanitized }
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

export async function exportTransactionsCsv(filter?: TransactionsFilter, destPath?: string): Promise<string> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    const args: any = {}
    if (typeof filter !== 'undefined') args.filter = filter
    if (typeof destPath !== 'undefined') args.dest_path = destPath
    return core.invoke('export_transactions_csv', args) as Promise<string>
  }
  throw new Error('Tauri bridge not available')
}

export async function exportTransactionsCsvData(filter?: TransactionsFilter): Promise<string> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    const args: any = {}
    if (typeof filter !== 'undefined') args.filter = filter
    return core.invoke('export_transactions_csv_data', args) as Promise<string>
  }
  throw new Error('Tauri bridge not available')
}

export async function previewImportCsv(csvText: string): Promise<any> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('preview_import_csv', { csvText: csvText }) as Promise<any>
  }
  throw new Error('Tauri bridge not available')
}

export async function applyImportCsv(csvText: string): Promise<number> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('apply_import_csv', { csvText: csvText }) as Promise<number>
  }
  throw new Error('Tauri bridge not available')
}

export async function createBackup(destPath: string): Promise<string> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('create_backup', { dest_path: destPath }) as Promise<string>
  }
  throw new Error('Tauri bridge not available')
}

export async function restoreBackup(srcPath: string): Promise<void> {
  if (isTauriAvailable()) {
    const core = await import('@tauri-apps/api/core')
    return core.invoke('restore_backup', { src_path: srcPath }) as Promise<void>
  }
  throw new Error('Tauri bridge not available')
}
