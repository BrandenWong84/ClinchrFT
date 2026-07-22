import React, { useEffect, useState } from 'react'
import TransactionFilters from './TransactionFilters'
import { useFilters } from '../lib/filters'
import { getCategories } from '../services/tauri-api'

export default function VisualizationToolbar({ onToggleChart, onBucketChange }: { onToggleChart: (mode: 'pie'|'stacked') => void, onBucketChange: (b: string) => void }) {
  const { filters, setStartDate, setEndDate, setCategoryId } = useFilters()
  const [categories, setCategories] = useState<{id:string,name:string}[]>([])

  useEffect(() => {
    getCategories().then(c => setCategories(c.map((x:any)=>({ id: x.id, name: x.name }))))
  }, [])

  return (
    <div className="mb-12">
      <TransactionFilters
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={d => setStartDate(d)}
        onEndDateChange={d => setEndDate(d)}
        accounts={[]}
        categories={categories}
        onAccountChange={() => {}}
        accountId={undefined}
        categoryId={filters.categoryId}
        onCategoryChange={(id) => setCategoryId(id)}
        onApply={() => { /* already updating live */ }}
        onClear={() => { setStartDate(undefined); setEndDate(undefined); setCategoryId(undefined) }}
      />
      <div className="row mt-8">
        <label>Chart: </label>
        <button className="btn" onClick={() => onToggleChart('pie')}>Pie</button>
        <button className="btn" onClick={() => onToggleChart('stacked')}>Stacked</button>
        <label className="ml-8">Bucket:</label>
        <select onChange={e => onBucketChange(e.target.value)} defaultValue="month">
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </div>
    </div>
  )
}
