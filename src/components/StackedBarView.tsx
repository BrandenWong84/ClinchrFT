import React from 'react'
import { centsToDollars } from '../lib/money'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

function CustomLegend({ payload, onToggle, visible }: any) {
  if (!payload) return null
  return (
    <div className="flex-wrap gap-8">
      {payload.map((p: any) => (
        <span key={p.key} className="btn-wrapper" style={{ ['--btn-bg' as any]: visible[p.key] ? p.color : '#fff', ['--btn-color' as any]: visible[p.key] ? '#fff' : '#000', ['--btn-border' as any]: visible[p.key] ? '2px solid #000' : '1px solid #ccc' }}>
          <button onClick={() => onToggle(p.key)} aria-pressed={!!visible[p.key]} aria-label={`legend-toggle-${p.value}`} title={`${p.value} — ${p.key ? String(p.key).slice(0,8) : 'null'}`} className="btn btn--toggle btn--colorable">
            {p.value}
          </button>
        </span>
      ))}
    </div>
  )
}

export default function StackedBarView({ data, categoriesMap }: { data: { bucket: string; categoryId?: string; totalAmountCents: number }[], categoriesMap: Record<string,string> }) {
  // Pivot data into buckets with per-category amounts
  const buckets: Record<string, Record<string, number>> = {}
  const categoriesSet: Set<string> = new Set()
  data.forEach(d => {
    const b = d.bucket
    if (!buckets[b]) buckets[b] = {}
    // group by display name so categories with the same name aggregate together
    const name = categoriesMap[d.categoryId ?? 'null'] ?? (d.categoryId ?? 'Uncategorized')
    const key = name
    categoriesSet.add(key)
    buckets[b][key] = (buckets[b][key] || 0) + d.totalAmountCents
  })

  const bucketKeys = Object.keys(buckets).sort()
  const categories = Array.from(categoriesSet)

  const chartData = bucketKeys.map(b => {
    const entry: any = { bucket: b }
    categories.forEach(cat => { entry[cat] = buckets[b][cat] || 0 })
    return entry
  })

  const colors = ['#4caf50','#2196f3','#ff9800','#9c27b0','#f44336','#3f51b5','#00bcd4']
  const colorMap: Record<string,string> = Object.fromEntries(categories.map((c,idx)=>[c, colors[idx % colors.length]]))
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {}
    categories.forEach(c => { v[c] = true })
    return v
  })

  const toggle = (catKey: string) => setVisible(s => ({ ...s, [catKey]: !s[catKey] }))

  // Ensure visibility map includes new categories when data arrives (preserve existing toggles)
  React.useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }
      let changed = false
      categories.forEach((c) => {
        if (typeof next[c] === 'undefined') { next[c] = true; changed = true }
      })
      if (Object.keys(prev).length === 0 && categories.length > 0) {
        categories.forEach((c) => { next[c] = true })
        changed = true
      }
      return changed ? next : prev
    })
  }, [categories])

  const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST)

  return (
    <div className="chart-h-420">
      <h3>Trends</h3>
      <div className="small-muted">Legend — click to toggle series</div>
      {isTest ? (
        <div>
          <BarChart width={600} height={300} data={chartData} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis tickFormatter={(v:any) => centsToDollars(v as number)} />
            <Tooltip formatter={(value: any) => centsToDollars(value as number)} />
            {categories.map((cat, idx) => (
              visible[cat] ? <Bar key={cat} dataKey={cat} stackId="a" fill={colorMap[cat]} name={categoriesMap[cat] ?? (cat === 'null' ? 'Uncategorized' : cat)} /> : null
            ))}
          </BarChart>
        </div>
      ) : (
        <ResponsiveContainer>
          <BarChart data={chartData} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip formatter={(value: any) => centsToDollars(value as number)} />
            {categories.map((cat, idx) => (
              visible[cat] ? <Bar key={cat} dataKey={cat} stackId="a" fill={colorMap[cat]} name={categoriesMap[cat] ?? (cat === 'null' ? 'Uncategorized' : cat)} /> : null
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="mt-8">
        <CustomLegend payload={categories.map((c,idx)=>({value: categoriesMap[c] ?? (c === 'null' ? 'Uncategorized' : c), key: c, color: colorMap[c]}))} onToggle={(key:any)=>{ toggle(key) }} visible={Object.fromEntries(categories.map(k=>[k, visible[k]]))} />
      </div>
    </div>
  )
}
