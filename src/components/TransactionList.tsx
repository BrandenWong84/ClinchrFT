import React from 'react'
import type { Transaction } from '../types'
import { centsToDollars } from '../lib/money'

type Props = {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionList({ transactions, onEdit, onDelete }: Props) {
  if (!transactions.length) return <div>No transactions</div>
  return (
    <table style={{width: '100%'}}>
      <thead>
        <tr><th>Date</th><th>Memo</th><th>Amount</th><th></th></tr>
      </thead>
      <tbody>
        {transactions.map(t => (
          <tr key={t.id}>
            <td>{t.date}</td>
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
