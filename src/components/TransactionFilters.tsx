import React from 'react'
import type { Account, Category } from '../types'

type Props = {
  startDate?: string | undefined
  endDate?: string | undefined
  onStartDateChange: (d?: string) => void
  onEndDateChange: (d?: string) => void
  accounts: {id:string,name:string}[]
  categories: {id:string,name:string}[]
  accountId?: string
  categoryId?: string | undefined
  onAccountChange: (id?: string) => void
  onCategoryChange: (id?: string | undefined) => void
  onApply: () => void
  onClear: () => void
}

export default function TransactionFilters({ startDate, endDate, onStartDateChange, onEndDateChange, accounts, categories, accountId, categoryId, onAccountChange, onCategoryChange, onApply, onClear }: Props) {
  return (
    <div style={{display:'flex', gap:12, alignItems:'center'}}>
      <label>
        Start:{' '}
        <input type="date" value={startDate ?? ''} onChange={e => onStartDateChange(e.target.value || undefined)} />
      </label>
      <label>
        End:{' '}
        <input type="date" value={endDate ?? ''} onChange={e => onEndDateChange(e.target.value || undefined)} />
      </label>
      <label>
        Category:{' '}
        <select value={categoryId ?? ''} onChange={e => onCategoryChange(e.target.value || undefined)}>
          <option value="">All</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <button onClick={onApply}>Apply</button>
      <button onClick={onClear}>Clear</button>
    </div>
  )
}
