import React from 'react'
import { centsToDollars } from '../lib/money'
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts'

function CustomLegend({ payload, onToggle, visible }: any) {
  if (!payload) return null
  return (
    <div className="row center gap-8">
      {payload.map((p: any) => (
        <span key={p.key} className="btn-wrapper" style={{ ['--btn-bg' as any]: visible[p.key] ? p.color : '#fff', ['--btn-color' as any]: visible[p.key] ? '#fff' : '#000', ['--btn-border' as any]: visible[p.key] ? '2px solid #000' : '1px solid #ccc' }}>
          <button
            onClick={() => onToggle(p.key)}
            aria-pressed={!!visible[p.key]}
            aria-label={`legend-toggle-${p.value}`}
            title={`${p.value} — ${p.key ? String(p.key).slice(0,8) : 'null'}`}
            className="btn btn--toggle btn--colorable"
          >
            {p.value}
          </button>
        </span>
      ))}
    </div>
  )
}

export default function PieChartView({ data, categoriesMap }: { data: { categoryId?: string; totalAmountCents: number }[], categoriesMap: Record<string,string> }) {
  const total = data.reduce((s,d)=>s + (d.totalAmountCents||0), 0)
  // Group incoming aggregates by display name so categories with the same name combine
  const colors = ['#4caf50','#2196f3','#ff9800','#9c27b0','#f44336','#3f51b5','#00bcd4']
  const grouped: Record<string, number> = {}
  data.forEach(d => {
    const name = categoriesMap[d.categoryId ?? 'null'] ?? (d.categoryId ?? 'Uncategorized')
    grouped[name] = (grouped[name] || 0) + (d.totalAmountCents || 0)
  })
  const chartData = Object.keys(grouped).map((name, idx) => ({ name, value: grouped[name], key: name, fill: colors[idx % colors.length] }))
  const categories = chartData.map((c, idx) => ({ value: c.name, key: c.key, color: c.fill }))
  const colorMap: Record<string,string> = Object.fromEntries(categories.map((c:any) => [c.key, c.color]))
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {}
    categories.forEach((c:any) => { v[c.key] = true })
    return v
  })

  // Ensure visibility map includes new categories when data arrives (preserve existing toggles)
  React.useEffect(() => {
    setVisible(prev => {
      const next = { ...prev }
      let changed = false
      categories.forEach((c:any) => {
        if (typeof next[c.key] === 'undefined') { next[c.key] = true; changed = true }
      })
      // if there were no keys at all (initial empty state), and categories exist, ensure all visible
      if (Object.keys(prev).length === 0 && categories.length > 0) {
        categories.forEach((c:any) => { next[c.key] = true })
        changed = true
      }
      return changed ? next : prev
    })
  }, [chartData])

  const toggle = (key: string) => setVisible(s => ({ ...s, [key]: !s[key] }))

  const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST)

  const visibleChartData = chartData.filter(c => visible[c.key])

  return (
    <div className="chart-h-300">
      <h3>Category Breakdown</h3>
      <div className="small-muted">Legend — click to toggle series</div>
      <div className="mb-12">Total: {centsToDollars(total)}</div>
      {/* Legend buttons are rendered once below via CustomLegend; remove inline duplicates */}
      <div className="chart-inner">
        <div className="chart-absolute-center">
          <div className="chart-total-center">
            <div className="chart-total-value">{centsToDollars(total)}</div>
            <div className="small-muted">Total</div>
          </div>
        </div>
        {isTest ? (
          <div>
            <PieChart width={300} height={200}>
              <Pie dataKey="value" data={visibleChartData} nameKey="name" cx={150} cy={100} outerRadius={80} label={(entry:any) => `${entry.name}: ${centsToDollars(entry.value)}`} />
              <Tooltip formatter={(value: any) => centsToDollars(value as number)} />
              {visibleChartData.map((d) => <Cell key={d.key} fill={d.fill ?? (colorMap[d.key] ?? '#8884d8')} stroke="#fff" strokeWidth={1} />)}
            </PieChart>
          </div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie dataKey="value" data={visibleChartData} nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry:any) => `${entry.name}: ${centsToDollars(entry.value)}`} />
              <Tooltip formatter={(value: any) => centsToDollars(value as number)} />
              {visibleChartData.map((d) => <Cell key={d.key} fill={d.fill ?? (colorMap[d.key] ?? '#8884d8')} stroke="#fff" strokeWidth={1} />)}
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-8">
        <CustomLegend payload={categories.map(c=>({value:c.value, key:c.key, color:c.color}))} onToggle={toggle} visible={visible} />
      </div>
    </div>
  )
}
