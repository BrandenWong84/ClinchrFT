/// <reference types="vitest" />
import React from 'react'
import { renderWithRouter, screen, fireEvent, waitFor } from './test-utils'
import { test, expect, vi } from 'vitest'
import VisualizationToolbar from '../src/components/VisualizationToolbar'
import FiltersProvider from '../src/lib/filters'
import * as api from '../src/services/tauri-api'

vi.mock('../src/services/tauri-api')

test('VisualizationToolbar renders and calls callbacks', async () => {
  (api.getCategories as any).mockResolvedValue([{ id: 'c1', name: 'Food' }, { id: 'c2', name: 'Rent' }])
  const onToggle = vi.fn()
  const onBucket = vi.fn()
  renderWithRouter(<FiltersProvider><VisualizationToolbar onToggleChart={onToggle} onBucketChange={onBucket} /></FiltersProvider>)
  // Wait for categories to load
  await waitFor(() => expect(api.getCategories).toHaveBeenCalled())
  const pieBtn = screen.getByText('Pie')
  fireEvent.click(pieBtn)
  expect(onToggle).toHaveBeenCalledWith('pie')
  const stackedBtn = screen.getByText('Stacked')
  fireEvent.click(stackedBtn)
  expect(onToggle).toHaveBeenCalledWith('stacked')
  const selects = screen.getAllByRole('combobox')
  const bucketSelect = selects[1]
  fireEvent.change(bucketSelect, { target: { value: 'week' } })
  expect(onBucket).toHaveBeenCalledWith('week')
})
