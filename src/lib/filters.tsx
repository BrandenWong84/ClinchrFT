import React, { createContext, useContext, useEffect, useState } from 'react'

export type Filters = {
  startDate?: string
  endDate?: string
  categoryId?: string
}

type FiltersContextValue = {
  filters: Filters
  setFilters: (f: Filters) => void
  setStartDate: (d?: string) => void
  setEndDate: (d?: string) => void
  setCategoryId: (id?: string) => void
}

const FiltersContext = createContext<FiltersContextValue | null>(null)

function parseFromUrl(): Filters {
  try {
    const p = new URLSearchParams(window.location.search)
    const start = p.get('start') || undefined
    const end = p.get('end') || undefined
    const cat = p.get('cat') || undefined
    return { startDate: start || undefined, endDate: end || undefined, categoryId: cat || undefined }
  } catch (e) {
    return {}
  }
}

function pushToUrl(f: Filters) {
  try {
    const p = new URLSearchParams(window.location.search)
    if (f.startDate) p.set('start', f.startDate)
    else p.delete('start')
    if (f.endDate) p.set('end', f.endDate)
    else p.delete('end')
    if (f.categoryId) p.set('cat', f.categoryId)
    else p.delete('cat')
    const qs = p.toString()
    const path = window.location.pathname + (qs ? `?${qs}` : '')
    window.history.replaceState({}, '', path)
  } catch (e) {
    // ignore
  }
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(() => parseFromUrl())

  useEffect(() => {
    pushToUrl(filters)
  }, [filters.startDate, filters.endDate, filters.categoryId])

  const setFilters = (f: Filters) => setFiltersState(f)
  const setStartDate = (d?: string) => setFiltersState(s => ({ ...s, startDate: d }))
  const setEndDate = (d?: string) => setFiltersState(s => ({ ...s, endDate: d }))
  const setCategoryId = (id?: string) => setFiltersState(s => ({ ...s, categoryId: id }))

  return (
    <FiltersContext.Provider value={{ filters, setFilters, setStartDate, setEndDate, setCategoryId }}>
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider')
  return ctx
}

export default FiltersProvider
