import React, { useEffect, useState } from 'react'
import type { Transaction } from '../types/index.js'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getAccounts, getCategories, createAccount } from '../services/tauri-api.js'
import TransactionList from '../components/TransactionList.js'
import TransactionForm from '../components/TransactionForm.js'

const LAST_ACCOUNT_KEY = 'clinchrft:lastAccountId'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accountsMap, setAccountsMap] = useState<Record<string,string>>({})
  const [accountsList, setAccountsList] = useState<{id:string,name:string}[]>([])
  const [categoriesMap, setCategoriesMap] = useState<Record<string,string>>({})
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
      setCategoriesMap(Object.fromEntries(categories.map(c => [c.id, c.name])))
      setTransactions(txs)

      // determine selection
      const saved = localStorage.getItem(LAST_ACCOUNT_KEY)
      if (saved !== null) {
        // if saved is empty string, keep unassigned
        setSelectedAccountId(saved)
      } else if (accounts.length === 0) {
        // create default account
        const acc = await createAccount('default')
        // reload accounts
        const refreshed = await getAccounts()
        setAccountsList(refreshed)
        setAccountsMap(Object.fromEntries(refreshed.map(a => [a.id, a.name])))
        setSelectedAccountId(acc.id)
        localStorage.setItem(LAST_ACCOUNT_KEY, acc.id)
      } else {
        // default to first account
        setSelectedAccountId(accounts[0].id)
        localStorage.setItem(LAST_ACCOUNT_KEY, accounts[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (data: Omit<Transaction,'id'>) => {
    const payload = { ...data, accountId: selectedAccountId === '' ? undefined : selectedAccountId }
    await createTransaction(payload)
    setShowForm(false)
    load()
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
            <option value="">Unassigned</option>
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
          <TransactionForm initial={editing || undefined} selectedAccountId={selectedAccountId} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={editing ? handleUpdate : handleCreate} />
        </div>
      )}
    </div>
  )
}
