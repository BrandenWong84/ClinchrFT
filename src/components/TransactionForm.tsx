import React, { useEffect, useState } from 'react'
import type { Transaction } from '../types/index'
import type { Category } from '../types/index'
import { dollarsToCents, centsToDollars } from '../lib/money'
import { getCategories } from '../services/tauri-api'

type Props = {
  initial?: Partial<Transaction>
  onCancel?: () => void
  onSave: (data: Omit<Transaction, 'id'>) => void
  selectedAccountId?: string
  categories?: Category[]
}

export default function TransactionForm({ initial = {}, onCancel, onSave, selectedAccountId, categories: propCategories }: Props) {
  const [categoryId, setCategoryId] = useState(initial.categoryId || '')
  const [categories, setCategories] = useState<Category[]>(propCategories ?? [])
  const [amount, setAmount] = useState(initial.amountCents !== undefined ? centsToDollars(initial.amountCents) : '')
  const [memo, setMemo] = useState(initial.memo || '')
  const [date, setDate] = useState(initial.date || '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const amountCents = dollarsToCents(amount)
    // accountId is provided by parent via selectedAccountId; fall back to initial.accountId if parent didn't pass one
    const resolvedAccountId = typeof selectedAccountId !== 'undefined' ? selectedAccountId : (initial.accountId ?? '')
    const payload = {
      accountId: resolvedAccountId === '' ? undefined : resolvedAccountId,
      categoryId: categoryId === '' ? undefined : categoryId,
      amountCents,
      memo: memo || undefined,
      date,
    }
    onSave(payload)
  }

  useEffect(() => {
    let mounted = true
    // prefer categories passed via props from parent; otherwise fetch
    if (propCategories && Array.isArray(propCategories)) {
      setCategories(propCategories)
      return () => { mounted = false }
    }
    getCategories().then(cats => {
      if (mounted) setCategories(cats)
    }).catch(() => {})
    return () => { mounted = false }
  }, [propCategories])

  return (
    <form onSubmit={submit} className="form-grid">
      {/* Account selection is provided by the Transactions page; no free-text account input allowed. */}
      <label>Category
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          <option value="">No category</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>Amount
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="123.45" required />
      </label>
      <label>Date
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </label>
      <label>Memo
        <input value={memo} onChange={e => setMemo(e.target.value)} />
      </label>
      <div>
        <button className="btn" type="submit">Save</button>
        {onCancel && <button className="btn ml-8" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
