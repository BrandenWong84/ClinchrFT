/// <reference types="vitest" />
import React from 'react'
import { test, expect } from 'vitest'
import { renderWithRouter, screen } from './test-utils'
import PieChartView from '../src/components/PieChartView'
import StackedBarView from '../src/components/StackedBarView'

test('PieChartView renders category labels and totals', () => {
  const data = [{ categoryId: 'c1', totalAmountCents: 150 }, { categoryId: undefined, totalAmountCents: 50 }]
  const map = { c1: 'Food', null: 'Uncategorized' }
  renderWithRouter(<PieChartView data={data as any} categoriesMap={map as any} />)
  // check that legend or labels contain category names
  expect(screen.queryAllByText(/Food/).length).toBeGreaterThan(0)
  expect(screen.queryAllByText(/Uncategorized/).length).toBeGreaterThan(0)
})

test('StackedBarView renders buckets and category buttons', () => {
  const data = [
    { bucket: '2026-07-01', categoryId: 'c1', totalAmountCents: 100 },
    { bucket: '2026-07-01', categoryId: undefined, totalAmountCents: 50 },
    { bucket: '2026-07-02', categoryId: 'c1', totalAmountCents: 200 }
  ]
  const map = { c1: 'Food', null: 'Uncategorized' }
  renderWithRouter(<StackedBarView data={data as any} categoriesMap={map as any} />)
  expect(screen.queryAllByText('Food').length).toBeGreaterThan(0)
  expect(screen.queryAllByText('Uncategorized').length).toBeGreaterThan(0)
  // bucket labels (present in axis ticks or legend)
  expect(screen.queryAllByText('2026-07-01').length).toBeGreaterThan(0)
})
