# Task: Transactions CRUD — Implementation Specification

Purpose
- Provide a single, self-contained spec for implementing Transactions create/read/update/delete (CRUD). The `@engineer` agent must only reference this file in `tasks/` for requirements and should not open other `tasks/*` files unless explicitly instructed.

High-level goals
- Persist transactions in SQLite using the existing schema (`db/migrations/0001_init.sql`).
- Expose safe Tauri commands as the single gateway for DB operations.
- Provide a responsive frontend UI to list, create, edit, and delete transactions.
- Include tests and teaching artifacts per project conventions.

Branch & PR
- Branch name: `feature/transactions-crud`.
- Keep commits small and focused: DB helpers, Tauri commands, frontend services, UI components, tests.
- Open a PR with the summary, annotated code explanations, and run/test instructions.

Files/areas to modify
- Tauri / Rust (backend, required):
  - `src-tauri/src/db.rs` — Add DB connection helpers, run migrations, and CRUD functions for transactions.
  - `src-tauri/src/commands.rs` — Add Tauri commands wrapping the DB helpers: `create_transaction`, `update_transaction`, `delete_transaction`, `get_transactions`.
  - `src-tauri/src/main.rs` — Ensure commands are registered (if not already).

- Frontend (renderer, required):
  - `src/services/tauri-api.ts` — Add TypeScript wrappers for the new Tauri commands.
  - `src/pages/Transactions.tsx` — Replace mock list with real data fetching; add create/edit UI flows or wire to components.
  - `src/components/TransactionList.tsx` (new) — Present list with edit/delete actions.
  - `src/components/TransactionForm.tsx` (new) — Create/Edit form; use `src/lib/money.ts` for parsing/formatting.

- Tests (required):
  - Rust unit tests in `src-tauri/src/db.rs` for DB helpers (in-memory or temp DB path).
  - Vitest tests for `src/lib/money.ts` (already present) and component-level tests for `TransactionForm` logic.

Design details — Backend
- DB helpers (in `db.rs`):
  - open_db(path: &Path) -> Result<rusqlite::Connection>
  - run_migrations(conn: &Connection) -> Result<()>
  - get_transactions(conn: &Connection, filters: Option<Filters>) -> Result<Vec<TransactionRow>>
  - insert_transaction(conn: &Connection, tx: NewTransaction) -> Result<()> (use parameterized queries)
  - update_transaction(conn: &Connection, id: &str, tx: UpdatedTransaction) -> Result<()>
  - delete_transaction(conn: &Connection, id: &str) -> Result<()>

- Types:
  - Define a Rust struct mapping for transaction rows that serializes to JSON for the renderer (derive `Serialize`). Use explicit field names: `id`, `account_id`, `category_id`, `amount_cents`, `memo`, `date` (ISO 8601 string).

- Tauri commands (`commands.rs`):
  - `get_transactions(filters: Option<GetTransactionsFilter>) -> Vec<Transaction>`
  - `create_transaction(tx: CreateTransaction) -> Result<Transaction, String>`
  - `update_transaction(id: String, tx: UpdateTransaction) -> Result<Transaction, String>`
  - `delete_transaction(id: String) -> Result<(), String>`

- Error handling:
  - Return clear error messages to the renderer. Do not leak filesystem paths or internals in messages.

Design details — Frontend
- `src/services/tauri-api.ts`:
  - Add functions: `getTransactions(filters?)`, `createTransaction(tx)`, `updateTransaction(id, tx)`, `deleteTransaction(id)` using `invoke`.

- UI behavior (`Transactions.tsx` and components):
  - On mount, call `getTransactions()` and show loading state.
  - Show a list with `date`, `memo`, `account` (display name from `getAccounts()`), `category` (display name), and formatted amount via `src/lib/money.ts`.
  - Provide an `Add Transaction` button that opens `TransactionForm` in modal for create.
  - Each row has `Edit` (populate form) and `Delete` (confirm modal) actions.
  - After create/update/delete, refresh the list (optimistic UI updates allowed, but confirm persistence by re-fetching on success).

UI review & iterative direction (for the repo owner)
- Local dev commands for checking the UI quickly:

```bash
npm install
# Frontend only (fast):
npm run dev
# Full Tauri dev (runs backend + renderer):
npm run tauri
```

- When you want to visually review progress, do this:
  1. Ask the engineer to implement backend commands but keep the existing stub responses available behind a feature-flag (for quick UI testing). The stub can be toggled by setting an environment variable or a compile-time cfg flag so you can compare stub vs real DB behavior.
  2. Run `npm run dev` to preview the frontend and ensure the list/form render correctly with stubs.
  3. Run `npm run tauri` to test persistence against the real SQLite DB and demonstrate create/edit/delete flows.
  4. During the review, provide direct UI feedback: label, field order, required validations, and any UX changes; iterate quickly — the engineer should make small commits reflecting requested tweaks.

Acceptance criteria (must pass before merge)
- Backend:
  - Tauri commands return JSON-serializable transaction objects matching the TypeScript `Transaction` type.
  - CRUD operations persist to SQLite in the app data path and survive app restart.
  - Unit tests for DB helpers pass locally.

- Frontend:
  - Transactions page lists persisted transactions.
  - Create/Edit flows validate input and persist changes.
  - Delete flow prompts for confirmation and removes rows on success.
  - Vitest tests for money parsing and any pure logic functions pass.

Security & privacy notes
- Do not add any network or telemetry code.
- Store DB under the application data path (use `directories::ProjectDirs` like the existing `get_app_path`).

Teaching artifacts (required for PR)
- Include in the PR description and a separate `docs/` or PR body the following:
  1. One-paragraph summary of what changed and why.
  2. Annotated code notes explaining non-obvious parts (line-by-line or short section annotations for new/modified files).
  3. How to run and test locally (commands and expected results).
  4. Suggested follow-ups or learning links.

Estimated effort
- 1.5–3 days for a single developer to implement with tests and basic UI polish.

Checklist (engineer to complete)
- [ ] Create branch `feature/transactions-crud`.
- [ ] Implement DB helpers in `src-tauri/src/db.rs` and add unit tests.
- [ ] Add/extend Tauri commands in `src-tauri/src/commands.rs` and register them.
- [ ] Update `src/services/tauri-api.ts` with corresponding wrappers.
- [ ] Implement `TransactionList` and `TransactionForm` components and wire into `src/pages/Transactions.tsx`.
- [ ] Add Vitest component/logic tests and run them.
- [ ] Add teaching artifacts and open PR.

Notes for the engineer (strict)
- Only use this spec file `tasks/todo-transactions-crud.md` for task requirements. Do not open or rely on other `tasks/*` files as they are out-of-scope for this task unless the repo owner instructs otherwise.
- Keep changes small and testable. Ask for clarification in the PR when UI choices are ambiguous.

Next step for the user
- Switch to a fresh session with the `@engineer` persona to implement this spec.
