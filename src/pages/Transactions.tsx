import React, { useEffect, useState } from 'react'
import type { Transaction } from '../types/index.js'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../services/tauri-api.js'
import TransactionList from '../components/TransactionList.js'
import TransactionForm from '../components/TransactionForm.js'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const txs = await getTransactions()
      setTransactions(txs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (data: Omit<Transaction,'id'>) => {
    await createTransaction(data)
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

  return (
    <div>
      <h2>Transactions</h2>
      <div style={{marginBottom: 12}}>
        <button onClick={() => { setEditing(null); setShowForm(true) }}>Add Transaction</button>
      </div>
      {loading ? <div>Loading...</div> : <TransactionList transactions={transactions} onEdit={(t)=>{setEditing(t); setShowForm(true)}} onDelete={handleDelete} />}

      {showForm && (
        <div style={{border: '1px solid #ccc', padding: 12, marginTop:12}}>
          <h3>{editing ? 'Edit' : 'Add'} Transaction</h3>
          <TransactionForm initial={editing || undefined} onCancel={() => { setShowForm(false); setEditing(null) }} onSave={editing ? handleUpdate : handleCreate} />
        </div>
      )}
    </div>
  )
}
