import React, { useState } from 'react'
import type { Transaction } from '../types/index.js'
import { dollarsToCents, centsToDollars } from '../lib/money.js'

type Props = {
  initial?: Partial<Transaction>
  onCancel?: () => void
  onSave: (data: Omit<Transaction, 'id'>) => void
  selectedAccountId?: string
}

export default function TransactionForm({ initial = {}, onCancel, onSave, selectedAccountId }: Props) {
  const [categoryId, setCategoryId] = useState(initial.categoryId || '')
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

  return (
    <form onSubmit={submit} style={{display: 'grid', gap:8}}>
      {/* Account selection is provided by the Transactions page; no free-text account input allowed. */}
      <label>Category
        <input value={categoryId} onChange={e => setCategoryId(e.target.value)} />
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
        <button type="submit">Save</button>
        {onCancel && <button type="button" onClick={onCancel} style={{marginLeft:8}}>Cancel</button>}
      </div>
    </form>
  )
}
