import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import TransactionsPage from './pages/Transactions'
import DashboardPage from './pages/Dashboard'
import FiltersProvider from './lib/filters'

export default function App() {
  return (
    <BrowserRouter>
      <FiltersProvider>
        <div className="app-container">
          <h1>ClinchrFT (scaffold)</h1>
          <div className="mb-12">
            <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-button nav-button--active' : 'nav-button'}>Transactions</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-button nav-button--active ml-8' : 'nav-button ml-8'}>Dashboard</NavLink>
          </div>
          <Routes>
            <Route path="/" element={<Navigate to="/transactions" replace />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </div>
      </FiltersProvider>
    </BrowserRouter>
  )
}
