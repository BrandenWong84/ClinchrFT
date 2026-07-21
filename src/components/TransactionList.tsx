import React from 'react'
import type { Transaction } from '../types/index'
import { centsToDollars } from '../lib/money'

type Props = {
  transactions: Transaction[]
  accountsMap?: Record<string,string>
  categoriesMap?: Record<string,string>
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionList({ transactions, accountsMap = {}, categoriesMap = {}, onEdit, onDelete }: Props) {
  if (!transactions.length) return <div>No transactions</div>
  return (
    <table style={{width: '100%'}}>
      <thead>
        <tr><th>Date</th><th>Account</th><th>Category</th><th>Memo</th><th>Amount</th><th></th></tr>
      </thead>
      <tbody>
        {transactions.map(t => (
          <tr key={t.id}>
            <td>{t.date}</td>
            <td>{t.accountId ? (accountsMap[t.accountId] ?? 'Unassigned / Deleted') : 'Unassigned / Deleted'}</td>
            <td>{t.categoryId ? (categoriesMap[t.categoryId] ?? 'Unassigned / Deleted') : 'Unassigned / Deleted'}</td>
            <td>{t.memo}</td>
            <td style={{textAlign: 'right'}}>{centsToDollars(t.amountCents)}</td>
            <td>
              <button onClick={() => onEdit(t)}>Edit</button>
              <button onClick={() => onDelete(t.id)} style={{marginLeft:8}}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
