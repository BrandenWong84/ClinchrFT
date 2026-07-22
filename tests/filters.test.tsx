/// <reference types="vitest" />
import React from 'react'
import { test, expect } from 'vitest'
import { renderWithRouter, act } from './test-utils'
import FiltersProvider, { useFilters } from '../src/lib/filters'

function TestConsumer() {
  const { filters, setStartDate, setEndDate, setCategoryId } = useFilters()
  return (
    <div>
      <div data-testid="start">{filters.startDate ?? ''}</div>
      <button onClick={() => setStartDate('2026-07-01')}>setstart</button>
      <button onClick={() => setEndDate('2026-07-31')}>setend</button>
      <button onClick={() => setCategoryId('cat-1')}>setcat</button>
    </div>
  )
}

test('FiltersProvider syncs to URL and exposes setters', () => {
  const { getByText, getByTestId } = renderWithRouter(<FiltersProvider><TestConsumer /></FiltersProvider>)
  act(() => { getByText('setstart').click() })
  expect(getByTestId('start').textContent).toBe('2026-07-01')
  // URL should include start param
  expect(window.location.search.includes('start=2026-07-01')).toBe(true)
  act(() => { getByText('setend').click() })
  expect(window.location.search.includes('end=2026-07-31')).toBe(true)
  act(() => { getByText('setcat').click() })
  expect(window.location.search.includes('cat=cat-1')).toBe(true)
})
