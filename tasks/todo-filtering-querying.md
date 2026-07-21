# Todo: Filtering & Querying (Transactions)

Summary
- Feature: Filtering and querying transactions by date range, account, category, pagination, sorting, and aggregates for dashboards.
- Outcome: Fast, server-driven filtered queries (Tauri/SQLite) with a clear frontend UX (filters, loading/empty states, pagination) and aggregate endpoints for dashboards.

Scope
- Backend (Tauri/Rust): SQL queries, parameter handling, pagination, aggregates, indexes, and Tauri command surface.
- Frontend (React/TS): Filter UI, calling Tauri commands via `src/services/tauri-api.ts`, rendering results, pagination controls, and basic client-side caching/loading states.

Design constraints
- All DB access must go through Tauri commands (see [docs/AGENTS.md](docs/AGENTS.md#runtime-boundaries)).
- Use integer cents for money values; do not use floats (use existing `src/lib/money.ts`).
- Inputs must be sanitized and parameterized to prevent SQL injection.
- Default pagination: `limit=50`, max `limit=1000`.
- Dates: accept ISO-8601 date strings (YYYY-MM-DD) or RFC3339 timestamps — document chosen format in `src/services/tauri-api.ts`.

Tauri (Rust) responsibilities — explicit
- Files to modify:
  - [src-tauri/src/db.rs](src-tauri/src/db.rs)
  - [src-tauri/src/commands.rs](src-tauri/src/commands.rs)

- Commands to add or extend (signatures shown conceptually):
  - `get_transactions(filter: GetTransactionsFilter) -> PaginatedTransactions`
    - Filter fields (all optional): `start_date?: String`, `end_date?: String`, `account_id?: i64`, `category_id?: i64`, `min_amount_cents?: i64`, `max_amount_cents?: i64`, `q?: String` (text search in memo), `sort_by?: String` (date|amount), `sort_dir?: String` (asc|desc), `limit?: u32`, `offset?: u32`.
    - Response: `items: Vec<TransactionRow>`, `total: u64`, `limit: u32`, `offset: u32`.
  - `get_transactions_count(filter: GetTransactionsFilter) -> u64` (optional; can be combined in `get_transactions` response)
  - `get_transactions_aggregate_by_category(start_date?: String, end_date?: String, account_id?: i64) -> Vec<CategoryAggregate>`
  - `get_transactions_aggregate_by_date(start_date?: String, end_date?: String, interval: String) -> Vec<DateAggregate>` (interval: day|month)

- DB layer changes in `db.rs`:
  - Add parameterized SQL helpers that build WHERE clauses only for present filters.
  - Ensure queries use `LIMIT ? OFFSET ?` for pagination.
  - Add indices if absent: `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`, `idx_transactions_account_id`, `idx_transactions_category_id`.
  - Use prepared statements and bound parameters — do not construct SQL via string interpolation with untrusted input.
  - For text search `q`, use `LIKE` with escaped input or use SQLite full-text search (FTS) if preferable — document the choice.

- Performance & safety:
  - Enforce `limit` caps server-side (reject or clamp >1000).
  - Protect against expensive unbounded queries (require either date range or explicit `limit` for large datasets).

- Tests (Rust):
  - Unit tests for DB helper functions that build queries for combinations of filters.
  - Integration tests for Tauri commands (where feasible in CI) using a temporary SQLite DB file.

Frontend responsibilities — explicit
- Files to modify/add:
  - [src/services/tauri-api.ts](src/services/tauri-api.ts)
  - [src/pages/Transactions.tsx](src/pages/Transactions.tsx)
  - [src/components/TransactionList.tsx](src/components/TransactionList.tsx)
  - [src/components/TransactionFilters.tsx] (new: date range picker, account/category dropdowns, quick ranges)

- Service layer:
  - Add `getTransactions(filters)` and `getTransactionsAggregates(filters)` wrappers that call corresponding Tauri commands and map types to frontend models.
  - Document expected date format and paging parameters in the service file.

- UI/UX:
  - Add a top-level filter bar in `Transactions.tsx` with:
    - Date range picker (start/end)
    - Account dropdown (populated from `get_accounts`)
    - Category dropdown (populated from `get_categories`)
    - Free-text search box (memo)
    - Apply / Clear buttons and quick presets (Last 7 days, This Month)
  - Show loading spinner while fetching, and an empty state when no results.
  - Add pagination controls (Prev/Next, current page indicator) and page-size selector.
  - Ensure filters are debounce-controlled for text input and don’t spam Tauri commands.
  - Keep `TransactionList` pure and pass `items` + `isLoading` + `onEdit`/`onDelete` callbacks.

- Frontend tests (Vitest + React Testing Library):
  - Unit tests for `src/services/tauri-api.ts` (mock Tauri invocations).
  - Component tests for `TransactionFilters` (ensure filter state maps correctly to service call args).
  - Integration tests for `Transactions.tsx` flow: apply filters, receive mocked data, ensure pagination and empty states show correctly.

Acceptance criteria
- Functional:
  - Applying filters returns correct, paginated results consistent with DB contents.
  - Pagination shows accurate total pages (total/limit) and Prev/Next behave correctly.
  - Aggregates return correct sums (in integer cents) grouped by category or date interval.
  - UI shows loading and empty states appropriately.
- Safety & performance:
  - Server enforces `limit` cap and parameterized queries.
  - Queries use indexes and run efficiently on typical user DB sizes (thousands of rows).
- Tests:
  - Rust DB helper unit tests and frontend Vitest tests for filter logic exist and pass.

Implementation checklist (Engineer-ready)
- [ ] Add or extend Tauri command `get_transactions` in [src-tauri/src/commands.rs](src-tauri/src/commands.rs).
- [ ] Implement DB helpers in [src-tauri/src/db.rs](src-tauri/src/db.rs) to apply optional filters and pagination.
- [ ] Add aggregate endpoints `get_transactions_aggregate_by_category` and `get_transactions_aggregate_by_date`.
- [ ] Add/verify SQLite indexes for `date`, `account_id`, and `category_id`.
- [ ] Add Rust unit & integration tests for DB helpers and commands; run `cargo test`.
- [ ] Update `src/services/tauri-api.ts` with new client wrappers and document parameter formats.
- [ ] Add `TransactionFilters` component and wire into [src/pages/Transactions.tsx](src/pages/Transactions.tsx).
- [ ] Update `TransactionList` to accept filtered items and loading state.
- [ ] Add Vitest/RTL tests for the new service functions and filter UI.
- [ ] Run verification: `npx tsc --noEmit`, `npm test`, `cargo test` (see [docs/AGENTS.md](docs/AGENTS.md#verification-checklist)).

Notes & recommendations
- Prefer server-side aggregation for dashboards for speed on large DBs; implement `GROUP BY` SQL aggregates in Rust.
- For text search in `memo`, consider adding an FTS virtual table if fuzzy/full-text search will be needed later — treat that as a follow-up.
- Keep the Tauri command shapes stable; changing signatures requires simultaneous update to `src/services/tauri-api.ts`.

Developer guidance (how to run locally)
- Frontend dev server:

  npm install
  npm run dev

- Run frontend tests:

  npm test

- Run Rust tests:

  cd src-tauri
  cargo test

Learning artifacts
- When implementing, add the required teaching artifacts to `docs/learning-artifacts.md`:
  - One-paragraph summary of what changed and why.
  - Line-by-line explanation (or annotated snippets) for non-Rust/frontend developers.
  - How to run and test the change locally (commands above).
  - Suggested follow-up learning items (SQLite query tuning, Rust+SQL best practices).

Transition
- This file is ready for an `@engineer` session to implement the checklist above. Please start a fresh session with the `@engineer` persona to carry out the changes and tests.
