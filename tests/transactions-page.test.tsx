import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the tauri-api module so we can control responses
var mockGetTransactions: any
var mockGetAccounts: any
var mockGetCategories: any
var mockCreateAccount: any
var mockCreateTransaction: any
var mockUpdateTransaction: any
var mockDeleteTransaction: any

vi.mock('../src/services/tauri-api.js', () => {
  mockGetTransactions = vi.fn(async () => [])
  mockGetAccounts = vi.fn(async () => [{ id: 'real-1', name: 'Real' }])
  mockGetCategories = vi.fn(async () => [])
  mockCreateAccount = vi.fn(async (name: string) => ({ id: 'real-1', name }))
  mockCreateTransaction = vi.fn(async (tx: any) => ({ ...tx, id: 't1' }))
  mockUpdateTransaction = vi.fn()
  mockDeleteTransaction = vi.fn()

  return {
    getTransactions: mockGetTransactions,
    getAccounts: mockGetAccounts,
    getCategories: mockGetCategories,
    createAccount: mockCreateAccount,
    createTransaction: mockCreateTransaction,
    updateTransaction: mockUpdateTransaction,
    deleteTransaction: mockDeleteTransaction,
  }
});

import TransactionsPage from '../src/pages/Transactions.js'
import * as api from '../src/services/tauri-api.js'

describe('Transactions page', () => {
  beforeEach(() => { document.body.innerHTML = '' })
  afterEach(() => { window.localStorage.clear(); vi.resetAllMocks() })

  it('repairs a stale saved lastAccountId on load', async () => {
    // put a stale id in localStorage
    // @ts-ignore TS2349: test environment global resolution
    ;window.localStorage.setItem('clinchrft:lastAccountId', 'stale-id')

    // ensure mocked getAccounts returns a different id
    mockGetAccounts.mockResolvedValue([{ id: 'real-1', name: 'Real Account' }])

    render(<TransactionsPage />)

    // wait for load to finish and the select to appear
    await waitFor(() => expect(screen.getByText(/Transactions/i)).toBeTruthy())

    // the saved value should be repaired to the real account id
    expect(window.localStorage.getItem('clinchrft:lastAccountId')).toBe('real-1')
    const select = screen.getByLabelText(/Account/i) as HTMLSelectElement
    expect(select.value).toBe('real-1')
  })

  it('on FK error during create, refreshes accounts and shows alert', async () => {
    // start with a valid account selected
    mockGetAccounts.mockResolvedValue([{ id: 'real-1', name: 'Real Account' }])
    mockCreateTransaction.mockRejectedValue(new Error('Foreign key error: invalid account or category id'))
    // getAccounts will be called again on error — make it return a refreshed list
    mockGetAccounts.mockResolvedValueOnce([{ id: 'real-1', name: 'Real Account' }]).mockResolvedValueOnce([{ id: 'real-2', name: 'Repaired Account' }])

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<TransactionsPage />)

    // open form
    await waitFor(() => expect(screen.getByText(/Add Transaction/i)).toBeTruthy())
    const addBtn = screen.getByText(/Add Transaction/i)
    fireEvent.click(addBtn)

    // fill amount and date (required by TransactionForm)
    const amount = await screen.findByLabelText(/Amount/i) as HTMLInputElement
    const date = await screen.findByLabelText(/Date/i) as HTMLInputElement
    fireEvent.change(amount, { target: { value: '1.00' } })
    fireEvent.change(date, { target: { value: '2026-01-01' } })

    const saveBtn = screen.getByText(/Save/i)
    fireEvent.click(saveBtn)

    // expect alert called with message containing 'Could not save transaction'
    await waitFor(() => expect(alertSpy).toHaveBeenCalled())

    alertSpy.mockRestore()
  })
})
