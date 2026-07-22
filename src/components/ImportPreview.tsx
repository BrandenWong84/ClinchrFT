import React, { useState } from 'react'
import { previewImportCsv, applyImportCsv } from '../services/tauri-api'
import { centsToDollars } from '../lib/money'

type Props = {
  onDone: (applied: number) => void
  onCancel: () => void
}

export default function ImportPreview({ onDone, onCancel }: Props) {
  const [csvText, setCsvText] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const text = await f.text()
    setCsvText(text)
    setLoading(true)
    try {
      const p = await previewImportCsv(text)
      setPreview(p)
    } catch (err) {
      alert('Preview failed: ' + String(err))
    } finally { setLoading(false) }
  }

  async function handleApply() {
    if (!csvText) return
    setLoading(true)
    try {
      const n = await applyImportCsv(csvText)
      onDone(n)
    } catch (err) {
      alert('Import failed: ' + String(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="card">
      <h3>Import CSV</h3>
      <input type="file" accept=".csv,text/csv" onChange={handleFile} />
      {loading && <div>Working...</div>}
      {preview && (
        <div className="mt-8">
          <div>Good: {preview.good} Errors: {preview.errors} Warnings: {preview.warnings}</div>
          <div className="mt-8 scroll-max-200">
            <table className="table-full">
              <thead><tr><th>#</th><th>Date</th><th>Account</th><th>Amount</th><th>Memo</th><th>Errors</th></tr></thead>
              <tbody>
                {preview.rows.slice(0,50).map((r: any) => {
                  const cents = r.amount_cents ?? r.amountCents ?? r.amount ?? null
                  let amt = ''
                  try { if (typeof cents === 'number') amt = centsToDollars(cents) } catch (e) { amt = String(cents) }
                  return (
                    <tr key={r.index}>
                      <td>{r.index+1}</td>
                      <td>{r.date}</td>
                      <td>{r.account_name ?? r.account ?? ''}</td>
                      <td>{amt}</td>
                      <td>{r.memo}</td>
                      <td>{(r.errors||[]).join('; ')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-8">
            <button className="btn" onClick={handleApply}>Confirm Import</button>
            <button className="btn ml-8" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}
      <div className="mt-8">
        <button className="btn" onClick={onCancel}>Close</button>
      </div>
    </div>
  )
}
