import React, { useEffect, useMemo, useState } from 'react'
import VisualizationToolbar from '../components/VisualizationToolbar'
import PieChartView from '../components/PieChartView'
import StackedBarView from '../components/StackedBarView'
import { useFilters } from '../lib/filters'
import { getTransactionsAggregateByCategory, getTransactionsAggregateByDate, getCategories } from '../services/tauri-api'
import { seedDevData } from '../services/tauri-api'

export default function DashboardPage() {
  const { filters } = useFilters()
  const [mode, setMode] = useState<'pie'|'stacked'>('pie')
  const [bucket, setBucket] = useState<'day'|'week'|'month'|'year'>('month')
  const [catAgg, setCatAgg] = useState<any[]>([])
  const [dateAgg, setDateAgg] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => { getCategories().then(c => setCategories(c)) }, [])

  useEffect(() => {
    // fetch category aggregates
    getTransactionsAggregateByCategory(filters).then(r => setCatAgg(r)).catch(() => setCatAgg([]))
    getTransactionsAggregateByDate(filters, bucket).then(r => setDateAgg(r)).catch(() => setDateAgg([]))
  }, [filters.startDate, filters.endDate, filters.categoryId, bucket])

  const categoriesMap = useMemo(() => {
    const m: Record<string,string> = {}
    categories.forEach((c:any) => { m[c.id] = c.name })
    m['null'] = 'Uncategorized'
    return m
  }, [categories])

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="row space-between">
        <VisualizationToolbar onToggleChart={(m)=>setMode(m)} onBucketChange={(b)=>setBucket(b as any)} />
        {process.env.NODE_ENV !== 'production' ? (
          <div>
            <button className="btn" onClick={() => { seedDevData().then(()=>{ getCategories().then(c => setCategories(c)); getTransactionsAggregateByCategory(filters).then(r => setCatAgg(r)); getTransactionsAggregateByDate(filters, bucket).then(r => setDateAgg(r)); }) }}>Seed Dev Data</button>
          </div>
        ) : null}
      </div>
      <div className="mt-12">
        {mode === 'pie' ? <PieChartView data={catAgg} categoriesMap={categoriesMap} /> : <StackedBarView data={dateAgg} categoriesMap={categoriesMap} />}
      </div>
    </div>
  )
}
