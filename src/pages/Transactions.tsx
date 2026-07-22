import React, { useEffect, useRef, useState } from 'react'
import type { Transaction } from '../types/index'
import { getTransactionsPaged, createTransaction, updateTransaction, deleteTransaction, getAccounts, getCategories, createAccount } from '../services/tauri-api'
import TransactionList from '../components/TransactionList'
import TransactionForm from '../components/TransactionForm'
import TransactionFilters from '../components/TransactionFilters'
import ImportPreview from '../components/ImportPreview'
import { exportTransactionsCsv, exportTransactionsCsvData } from '../services/tauri-api'
import { detectTauriDialog, invokeSafely } from '../services/tauri-helpers'

const LAST_ACCOUNT_KEY = 'clinchrft:lastAccountId'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState<number>(0)
  const [accountsMap, setAccountsMap] = useState<Record<string,string>>({})
  const [accountsList, setAccountsList] = useState<{id:string,name:string}[]>([])
  const [categoriesMap, setCategoriesMap] = useState<Record<string,string>>({})
  const [categoriesList, setCategoriesList] = useState<{id:string,name:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
  const [limit, setLimit] = useState<number>(50)
  const [offset, setOffset] = useState<number>(0)
  const [debugApiInfo, setDebugApiInfo] = useState<string | null>(null)
  const [showApiDebug, setShowApiDebug] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [accounts, categories] = await Promise.all([getAccounts(), getCategories()])
      setAccountsList(accounts)
      setAccountsMap(Object.fromEntries(accounts.map(a => [a.id, a.name])))
      setCategoriesList(categories)
      setCategoriesMap(Object.fromEntries(categories.map(c => [c.id, c.name])))

      // determine selection
      const saved = localStorage.getItem(LAST_ACCOUNT_KEY)
      const validIds = new Set(accounts.map(a => a.id))
      if (saved !== null) {
        // if saved is empty string, keep unassigned; otherwise validate it exists
        if (saved === '') {
          setSelectedAccountId('')
        } else if (validIds.has(saved)) {
          setSelectedAccountId(saved)
        } else if (accounts.length > 0) {
          // saved id not found in DB — repair to first account
          setSelectedAccountId(accounts[0].id)
          localStorage.setItem(LAST_ACCOUNT_KEY, accounts[0].id)
        } else {
          // saved was invalid and no accounts exist — fallthrough to create default below
          // clear saved to allow default creation flow to run
          localStorage.removeItem(LAST_ACCOUNT_KEY)
        }
      } else if (accounts.length === 0) {
        // create default account — guard against concurrent mounts/StrictMode double-invoke
        if (!createdDefaultRef.current) {
          createdDefaultRef.current = true
          // re-check accounts to avoid race with another concurrent load
          const nowAccounts = await getAccounts()
          if (nowAccounts.length === 0) {
            const acc = await createAccount('default')
            // reload accounts
            const refreshed = await getAccounts()
            setAccountsList(refreshed)
            setAccountsMap(Object.fromEntries(refreshed.map(a => [a.id, a.name])))
            setSelectedAccountId(acc.id)
            localStorage.setItem(LAST_ACCOUNT_KEY, acc.id)
          } else {
            // someone else created it in the meantime — use first
            setAccountsList(nowAccounts)
            setAccountsMap(Object.fromEntries(nowAccounts.map(a => [a.id, a.name])))
            setSelectedAccountId(nowAccounts[0].id)
            localStorage.setItem(LAST_ACCOUNT_KEY, nowAccounts[0].id)
          }
        }
      } else {
        // default to first account
        setSelectedAccountId(accounts[0].id)
        localStorage.setItem(LAST_ACCOUNT_KEY, accounts[0].id)
      }
      // initial fetch of transactions after accounts/categories and selection are established
      await fetchTransactions()
    } finally {
      setLoading(false)
    }
  }

  const createdDefaultRef = useRef(false)

  useEffect(() => { load() }, [])

  const handleCreate = async (data: Omit<Transaction,'id'>) => {
    // Guard: if the persisted selected account id is stale, send undefined so FK won't fail.
    const validIds = new Set(accountsList.map(a => a.id))
    const accountToSend = selectedAccountId && validIds.has(selectedAccountId) ? selectedAccountId : undefined
    const payload = { ...data, accountId: accountToSend }
    try {
      await createTransaction(payload)
      setShowForm(false)
      load()
    } catch (e: any) {
      // on FK or other DB errors, refresh accounts and show a friendly message
      try { const refreshed = await getAccounts(); setAccountsList(refreshed); setAccountsMap(Object.fromEntries(refreshed.map(a => [a.id, a.name]))); } catch (_) {}
      // prefer string errors, fallback to generic
      const msg = (e && e.toString && typeof e.toString === 'function') ? e.toString() : 'Unknown error'
      alert('Could not save transaction: ' + msg + '. Your account selection was refreshed.')
    }
  }

  const handleUpdate = async (data: Omit<Transaction,'id'>) => {
    if (!editing) return
    await updateTransaction(editing.id, data)
    setEditing(null)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete transaction?')) return
    await deleteTransaction(id)
    fetchTransactions()
  }

  async function fetchTransactions(p?: { start?: string | undefined, end?: string | undefined, accountId?: string | undefined, categoryId?: string | undefined, limit?: number, offset?: number }) {
    setLoading(true)
    try {
      const f = {
        startDate: typeof p?.start !== 'undefined' ? p?.start : startDate,
        endDate: typeof p?.end !== 'undefined' ? p?.end : endDate,
        accountId: typeof p?.accountId !== 'undefined' ? p?.accountId : (selectedAccountId || undefined),
        categoryId: typeof p?.categoryId !== 'undefined' ? p?.categoryId : selectedCategoryId,
        limit: p?.limit ?? limit,
        offset: p?.offset ?? offset,
      }
      const res = await getTransactionsPaged(f)
      setTransactions(res.items)
      setTotal(res.total)
      setLimit(res.limit)
      setOffset(res.offset)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Transactions</h2>
      <div className="mb-12">
        <TransactionFilters
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={d => { setStartDate(d) }}
          onEndDateChange={d => { setEndDate(d) }}
          accounts={accountsList}
          categories={categoriesList}
          accountId={selectedAccountId}
          categoryId={selectedCategoryId}
          onAccountChange={id => { setSelectedAccountId(id || ''); localStorage.setItem(LAST_ACCOUNT_KEY, id || '') }}
          onCategoryChange={id => setSelectedCategoryId(id)}
          onApply={() => { setOffset(0); fetchTransactions({ start: startDate, end: endDate, accountId: selectedAccountId || undefined, categoryId: selectedCategoryId, limit, offset: 0 }) }}
          onClear={() => { setStartDate(undefined); setEndDate(undefined); setSelectedCategoryId(undefined); setOffset(0); fetchTransactions({ start: undefined, end: undefined, accountId: selectedAccountId || undefined, categoryId: undefined, limit, offset: 0 }) }}
        />
          <div className="mt-8">
            <button onClick={async () => {
              try {
                let dest: string | undefined = undefined
                let browserSaved = false
                const suggested = `transactions-${new Date().toISOString().replace(/[:.]/g,'')}.csv`

                // Try browser-native save picker first (must be invoked during user activation).
                try {
                  // @ts-ignore
                  if (typeof (window as any).showSaveFilePicker === 'function') {
                    const csv = await exportTransactionsCsvData({ startDate: startDate, endDate: endDate, accountId: selectedAccountId || undefined, categoryId: selectedCategoryId })
                    // @ts-ignore
                    const handle = await (window as any).showSaveFilePicker({ suggestedName: suggested, types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }] })
                    const writable = await handle.createWritable()
                    await writable.write(csv)
                    await writable.close()
                    alert('Exported via browser save')
                    browserSaved = true
                    dest = undefined
                  }
                } catch (e) {
                  console.warn('browser save fallback failed', e)
                }

                // If browser save didn't happen, try Tauri dialog via centralized helper
                if (!browserSaved) {
                  try {
                    const { dialog, info } = await detectTauriDialog()
                    if (showApiDebug) setDebugApiInfo(JSON.stringify(info))
                    if (dialog && typeof dialog.save === 'function') {
                      const p = await dialog.save({ defaultPath: suggested })
                      if (p) dest = p
                    } else {
                      console.warn('Tauri dialog.save not available; exporting to default app path')
                      if (!browserSaved) alert('Save dialog unavailable; export will be written to the app data folder instead.')
                    }
                  } catch (e) {
                    console.warn('detectTauriDialog failed', e)
                    if (showApiDebug) setDebugApiInfo(String(e))
                  }
                }
                if (!browserSaved) {
                  const p2 = await exportTransactionsCsv({ startDate: startDate, endDate: endDate, accountId: selectedAccountId || undefined, categoryId: selectedCategoryId }, dest)
                  alert('Exported to: ' + p2)
                }
              } catch (e: any) { alert('Export failed: ' + String(e)) }
            }}>Export</button>
            <label className="ml-8">
              <input type="checkbox" checked={showApiDebug} onChange={e => { setShowApiDebug(e.target.checked); if (!e.target.checked) setDebugApiInfo(null) }} /> Show debug
            </label>
            <button className="btn ml-8" onClick={() => setShowImport(true)}>Import</button>
          </div>
          {showApiDebug && debugApiInfo && (
            <div className="alert-debug">
              <strong>Debug: @tauri-apps/api</strong>
              <pre className="pre-wrap">{debugApiInfo}</pre>
            </div>
          )}

          <div className="row mt-8">
          <label>
            Account:{' '}
            <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); localStorage.setItem(LAST_ACCOUNT_KEY, e.target.value); fetchTransactions({ accountId: e.target.value || undefined, limit, offset: 0 }) }}>
              <option value="" disabled>Choose account</option>
              {accountsList.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={() => { setEditing(null); setShowForm(true) }}>Add Transaction</button>
        </div>
      </div>

      {loading ? <div>Loading...</div> : <>
        <TransactionList transactions={transactions} accountsMap={accountsMap} categoriesMap={categoriesMap} onEdit={(t)=>{setEditing(t); setShowForm(true)}} onDelete={handleDelete} />
        <div className="row mt-8">
          <button onClick={() => { const newOffset = Math.max(0, offset - limit); setOffset(newOffset); fetchTransactions({ offset: newOffset, limit }) }} disabled={offset === 0}>Prev</button>
          <div>Page {Math.floor(offset/limit) + 1} of {Math.max(1, Math.ceil(total/limit))} ({total} items)</div>
          <button onClick={() => { const newOffset = offset + limit; if (newOffset < total) { setOffset(newOffset); fetchTransactions({ offset: newOffset, limit }) } }} disabled={offset + limit >= total}>Next</button>
        </div>
      </>}

      {showForm && (
        <div className="card">
          <h3>{editing ? 'Edit' : 'Add'} Transaction</h3>
          <TransactionForm initial={editing || undefined} categories={categoriesList} selectedAccountId={selectedAccountId} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={editing ? handleUpdate : handleCreate} />
        </div>
      )}
      {showImport && (
        <ImportPreview onCancel={() => setShowImport(false)} onDone={async (n) => { setShowImport(false); if (n > 0) { alert('Imported ' + n + ' rows'); await load() } }} />
      )}
    </div>
  )
}
