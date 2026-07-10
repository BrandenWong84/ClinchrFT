import React from 'react'
import { Transaction } from '../types'
import { centsToDollars } from '../lib/money'

const mock: Transaction[] = [
  { id: '1', accountId: 'a1', categoryId: 'c1', amountCents: 12345, memo: 'Coffee', date: '2026-07-01' }
]

export default function TransactionsPage() {
  return (
    <div>
      <h2>Transactions</h2>
      <ul>
        {mock.map(t => (
          <li key={t.id}>{t.date} — {t.memo} — {centsToDollars(t.amountCents)}</li>
        ))}
      </ul>
    </div>
  )
}
