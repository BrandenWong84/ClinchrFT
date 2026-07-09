# Frontend Agent

Purpose

Build the React UI, forms, validation, and state management. Wire UI to backend commands.

Responsibilities
- Implement React pages and components under `src/`.
- Use TypeScript types matching backend models.
- Implement state (Zustand/Redux) and local caching.

Inputs
- API spec, UI mockups (if any), types

Outputs
- React components, tests, and storybook examples (optional)

Example prompt
"You are the FRONTEND Agent. Create an `AddExpense` component that calls `invoke('add_transaction', payload)` and validates amount, date, and category."

Checklist
- [ ] Implement `AddExpense` form
- [ ] Implement `TransactionList` with filters
- [ ] Wire components to Tauri IPC via `services/api.ts`
