import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'
import FiltersProvider from '../src/lib/filters'

export function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <FiltersProvider>{ui}</FiltersProvider>
    </MemoryRouter>
  )
}

export * from '@testing-library/react'
