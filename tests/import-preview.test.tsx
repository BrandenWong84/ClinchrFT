import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../src/services/tauri-api', () => {
  return {
    previewImportCsv: vi.fn(),
    applyImportCsv: vi.fn(),
  }
})

import ImportPreview from '../src/components/ImportPreview'

describe('ImportPreview', () => {
  beforeEach(async () => {
    const api = await import('../src/services/tauri-api')
    ;(api.previewImportCsv as any).mockReset()
    ;(api.applyImportCsv as any).mockReset()
  })

  it('reads file, previews and applies import', async () => {
    const api = await import('../src/services/tauri-api')
    ;(api.previewImportCsv as any).mockResolvedValue({ good: 1, errors: 0, warnings: 0, rows: [{ index: 0, date: '2026-01-01', amount_cents: 100, memo: 'x', errors: [] }] })
    ;(api.applyImportCsv as any).mockResolvedValue(1)

    const onDone = vi.fn()
    const onCancel = vi.fn()
    const { getByText, container } = render(<ImportPreview onDone={onDone} onCancel={onCancel} />)

    // Create a fake file and trigger change
    const file = new File(["date,amount,memo\n2026-01-01,1.00,hi"], 'test.csv', { type: 'text/csv' })
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    await waitFor(() => { fireEvent.change(input, { target: { files: [file] } }) })

    await waitFor(async () => {
      const api2 = await import('../src/services/tauri-api')
      expect((api2.previewImportCsv as any)).toHaveBeenCalled()
    })

    const confirm = getByText(/Confirm Import/i)
    fireEvent.click(confirm)

    await waitFor(async () => {
      const api3 = await import('../src/services/tauri-api')
      expect((api3.applyImportCsv as any)).toHaveBeenCalled()
    })
  })
})
