import React, { useState } from 'react'
import type { Transaction } from '../types'
import { dollarsToCents, centsToDollars } from '../lib/money'

type Props = {
  initial?: Partial<Transaction>
  onCancel?: () => void
  onSave: (data: Omit<Transaction, 'id'>) => void
}

export default function TransactionForm({ initial = {}, onCancel, onSave }: Props) {
  const [accountId, setAccountId] = useState(initial.accountId || '')
  const [categoryId, setCategoryId] = useState(initial.categoryId || '')
  const [amount, setAmount] = useState(initial.amountCents !== undefined ? centsToDollars(initial.amountCents) : '')
  const [memo, setMemo] = useState(initial.memo || '')
  const [date, setDate] = useState(initial.date || '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const amountCents = dollarsToCents(amount)
    onSave({ accountId, categoryId, amountCents, memo: memo || undefined, date })
  }

  return (
    <form onSubmit={submit} style={{display: 'grid', gap:8}}>
      <label>Account
        <input value={accountId} onChange={e => setAccountId(e.target.value)} required />
      </label>
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
