import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import TransactionForm from '../src/components/TransactionForm'

describe('TransactionForm', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('submits undefined categoryId when "No category" selected', async () => {
    const onSave = vi.fn()
    const categories = [ { id: 'c1', name: 'Cat1' }, { id: 'c2', name: 'Cat2' } ]

    render(<TransactionForm onSave={onSave} categories={categories} />)

    // ensure the category select exists
    const select = screen.getByLabelText(/Category/i) as HTMLSelectElement
    expect(select).toBeTruthy()

    // select the placeholder (value is empty string)
    fireEvent.change(select, { target: { value: '' } })

    // fill required fields: Amount and Date
    const amount = screen.getByLabelText(/Amount/i) as HTMLInputElement
    const date = screen.getByLabelText(/Date/i) as HTMLInputElement
    fireEvent.change(amount, { target: { value: '1.00' } })
    fireEvent.change(date, { target: { value: '2026-01-01' } })

    // submit
    const saveBtn = screen.getByText(/Save/i)
    fireEvent.click(saveBtn)

    expect(onSave).toHaveBeenCalled()
    const payload = onSave.mock.calls[0][0]
    expect(payload).toHaveProperty('categoryId')
    expect(payload.categoryId).toBeUndefined()
  })

  it('submits a valid categoryId when a category is selected', async () => {
    const onSave = vi.fn()
    const categories = [ { id: 'c1', name: 'Cat1' }, { id: 'c2', name: 'Cat2' } ]

    render(<TransactionForm onSave={onSave} categories={categories} />)

    const select = screen.getByLabelText(/Category/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'c2' } })

    const amount = screen.getByLabelText(/Amount/i) as HTMLInputElement
    const date = screen.getByLabelText(/Date/i) as HTMLInputElement
    fireEvent.change(amount, { target: { value: '2.00' } })
    fireEvent.change(date, { target: { value: '2026-01-02' } })

    const saveBtn = screen.getByText(/Save/i)
    fireEvent.click(saveBtn)

    expect(onSave).toHaveBeenCalled()
    const payload = onSave.mock.calls[0][0]
    expect(payload.categoryId).toBe('c2')
  })
})
