import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'

// Mock the tauri-api module used by the Transactions page
const exportMock = vi.fn(async (filter: any, dest?: string) => 'written-path')
const exportDataMock = vi.fn(async (filter: any) => 'col1,col2\n1,2')
const getAccountsMock = vi.fn(async () => [{ id: 'a1', name: 'Cash' }])
const getCategoriesMock = vi.fn(async () => [])

vi.mock('../src/services/tauri-api', () => ({
  getTransactionsPaged: async () => ({ items: [], total: 0, limit: 50, offset: 0 }),
  getAccounts: getAccountsMock,
  getCategories: getCategoriesMock,
  exportTransactionsCsv: exportMock,
  exportTransactionsCsvData: exportDataMock,
  previewImportCsv: async () => [],
  applyImportCsv: async () => 0,
  createBackup: async () => 'backup-path',
  restoreBackup: async () => undefined,
  createAccount: async (name: string) => ({ id: 'a_default', name })
}))

describe('Export flow', () => {
  let realShow: any
  let realAlert: any

  beforeEach(() => {
    // backup any existing implementation
    const g: any = globalThis as any
    realShow = g.showSaveFilePicker
    realAlert = g.alert
    g.alert = vi.fn()
  })

  afterEach(() => {
    exportMock.mockClear()
    exportDataMock.mockClear()
    getAccountsMock.mockClear()
    getCategoriesMock.mockClear()
    const g: any = globalThis as any
    g.alert = realAlert
    if (typeof realShow === 'undefined') {
      try { delete g.showSaveFilePicker } catch (e) {}
    } else {
      g.showSaveFilePicker = realShow
    }
  })

  it('uses browser save and does not call backend export when showSaveFilePicker succeeds', async () => {
    // provide a fake handle for showSaveFilePicker
    const writable = { write: vi.fn(async () => {}), close: vi.fn(async () => {}) }
    const handle = { createWritable: vi.fn(async () => writable) }
    ;(globalThis as any).showSaveFilePicker = vi.fn(async () => handle)

    const { default: TransactionsPage } = await import('../src/pages/Transactions')
    render(React.createElement(TransactionsPage))

    // wait for accounts to load (component mount triggers getAccounts)
    await waitFor(() => expect(getAccountsMock).toHaveBeenCalled())

    const btn = screen.getByText('Export')
    fireEvent.click(btn)

    // wait for export data to be requested and write to be called
    await waitFor(() => expect(exportDataMock).toHaveBeenCalled())
    await waitFor(() => expect(writable.write).toHaveBeenCalledWith('col1,col2\n1,2'))

    // backend export should NOT be called because browser save succeeded
    expect(exportMock).not.toHaveBeenCalled()
  })
})
