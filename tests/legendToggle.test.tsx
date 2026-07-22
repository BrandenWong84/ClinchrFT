/// <reference types="vitest" />
import React from 'react'
import { test, expect, beforeEach } from 'vitest'
import { renderWithRouter, screen, fireEvent, cleanup } from './test-utils'

beforeEach(() => cleanup())
import PieChartView from '../src/components/PieChartView'
import StackedBarView from '../src/components/StackedBarView'

test('PieChart legend toggle updates aria-pressed', () => {
  const data = [{ categoryId: 'c1', totalAmountCents: 150 }, { categoryId: undefined, totalAmountCents: 50 }]
  const map = { c1: 'Food', null: 'Uncategorized' }
  renderWithRouter(<PieChartView data={data as any} categoriesMap={map as any} />)

  const legendBtn = screen.getByLabelText('legend-toggle-Food')
  // initial state should be pressed (visible)
  expect(legendBtn.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(legendBtn)
  expect(legendBtn.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(legendBtn)
  expect(legendBtn.getAttribute('aria-pressed')).toBe('true')
})

test('StackedBar legend toggle updates aria-pressed and keeps other toggles', () => {
  const data = [
    { bucket: '2026-07-01', categoryId: 'c1', totalAmountCents: 100 },
    { bucket: '2026-07-01', categoryId: undefined, totalAmountCents: 50 },
    { bucket: '2026-07-02', categoryId: 'c1', totalAmountCents: 200 }
  ]
  const map = { c1: 'Food', null: 'Uncategorized' }
  renderWithRouter(<StackedBarView data={data as any} categoriesMap={map as any} />)

  const foodLegendBtn = screen.getByLabelText('legend-toggle-Food')
  const uncLegendBtn = screen.getByLabelText('legend-toggle-Uncategorized')

  expect(foodLegendBtn.getAttribute('aria-pressed')).toBe('true')
  expect(uncLegendBtn.getAttribute('aria-pressed')).toBe('true')

  fireEvent.click(foodLegendBtn)
  // legend button toggled
  expect(foodLegendBtn.getAttribute('aria-pressed')).toBe('false')
  // other toggle remains unchanged
  expect(uncLegendBtn.getAttribute('aria-pressed')).toBe('true')
})
