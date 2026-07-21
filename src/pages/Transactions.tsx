import React, { useEffect, useRef, useState } from 'react'
import type { Transaction } from '../types/index'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getAccounts, getCategories, createAccount } from '../services/tauri-api'
import TransactionList from '../components/TransactionList'
import TransactionForm from '../components/TransactionForm'

const LAST_ACCOUNT_KEY = 'clinchrft:lastAccountId'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountsMap, setAccountsMap] = useState<Record<string,string>>({})
  const [accountsList, setAccountsList] = useState<{id:string,name:string}[]>([])
  const [categoriesMap, setCategoriesMap] = useState<Record<string,string>>({})
  const [categoriesList, setCategoriesList] = useState<{id:string,name:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  async function load() {
    setLoading(true)
    try {
      const [txs, accounts, categories] = await Promise.all([getTransactions(), getAccounts(), getCategories()])
      setAccountsList(accounts)
      setAccountsMap(Object.fromEntries(accounts.map(a => [a.id, a.name])))
      setCategoriesList(categories)
      setCategoriesMap(Object.fromEntries(categories.map(c => [c.id, c.name])))
      setTransactions(txs)

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
    load()
  }

  const visibleTransactions = transactions.filter(t => {
    if (selectedAccountId === '') {
      return t.accountId === undefined || t.accountId === null || t.accountId === ''
    }
    return t.accountId === selectedAccountId
  })

  return (
    <div>
      <h2>Transactions</h2>
      <div style={{marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center'}}>
        <label>
          Account:{' '}
          <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); localStorage.setItem(LAST_ACCOUNT_KEY, e.target.value) }}>
            <option value="" disabled>Choose account</option>
            {accountsList.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <button onClick={() => { setEditing(null); setShowForm(true) }}>Add Transaction</button>
      </div>
      {loading ? <div>Loading...</div> : <TransactionList transactions={visibleTransactions} accountsMap={accountsMap} categoriesMap={categoriesMap} onEdit={(t)=>{setEditing(t); setShowForm(true)}} onDelete={handleDelete} />}

      {showForm && (
        <div style={{border: '1px solid #ccc', padding: 12, marginTop:12}}>
          <h3>{editing ? 'Edit' : 'Add'} Transaction</h3>
          <TransactionForm initial={editing || undefined} categories={categoriesList} selectedAccountId={selectedAccountId} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={editing ? handleUpdate : handleCreate} />
        </div>
      )}
    </div>
  )
}
