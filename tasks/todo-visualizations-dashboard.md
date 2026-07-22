# Visualizations & Summary Dashboard — Task Spec

## Overview
Add a separate Dashboard screen with interactive visualizations (pie + stacked bar) driven by the same date/category filters used on the Transactions page. Filters must be synchronized two-way between Transactions and Dashboard (changes on one page immediately reflected on the other). The Dashboard shows:
- Pie chart for total cost broken down by category in selected date range
- Toggle to switch pie ↔ stacked bar
- Stacked bar with time buckets: daily, weekly, monthly, yearly
- Hover tooltips showing category name and formatted total for that slice/bar segment

## UX / User Stories
- As a user, I can open a `Dashboard` screen separate from Transactions.
- As a user, I can apply date range and category filters on Dashboard and see charts update.
- As a user, when I change filters on Transactions, the Dashboard reflects those filters immediately (and vice versa).
- As a user, I can switch the pie chart to a stacked bar grouped by day/week/month/year.
- As a user, I can hover over a slice/stack and see category name + total formatted currency.

## Acceptance Criteria
- New route/page `/dashboard` exists and is reachable from main nav.
- Date and Category filters are present on Dashboard and mirror the Transactions filters state.
- Pie chart displays per-category totals for the active filters and total sum in center/legend.
- Stacked bar displays time buckets along X axis and stacked categories with hover tooltips.
- Toggle to switch between Pie and Stacked Bar works without page reload.
- Filters sync bi-directionally between pages (immediate, not only persisted on apply).
- Backend provides aggregated endpoints (see Commands touched). Frontend uses these endpoints.

## High-level Design / Architecture
- Shared Filters: implement a `FiltersContext` (React Context + URL query sync) in `src/lib/filters` so both Transactions and Dashboard consume and update a single source of truth. Context updates should also push to URL query params for deep-linking and back/forward navigation.
- UI Components (frontend):
  - `src/pages/Dashboard.tsx` — top-level page, composes toolbar + chart area.
  - `src/components/VisualizationToolbar.tsx` — contains date pickers, category selector, apply/clear, chart-toggle, bucket selector (day/week/month/year).
  - `src/components/PieChartView.tsx` — pie chart component (tooltip + legend).
  - `src/components/StackedBarView.tsx` — stacked bar chart component (time buckets + stacked series + tooltip + legend).
  - Reuse `src/components/TransactionFilters.tsx` or wrap it for consistent UX.
- Chart library recommendation: `recharts` (MIT) or `chart.js` via `react-chartjs-2`. The engineer may choose either; the spec assumes `recharts` for stacked bars + pie ease-of-use.
- Data flow:
  - Frontend updates filters in `FiltersContext` (and URL). Dashboard subscribes and requests aggregated data from backend.
  - Frontend uses `src/services/tauri-api.ts` wrappers for aggregation endpoints.
  - Backend: add command wrappers in `src-tauri/src/commands.rs` that call existing DB helper functions in `src-tauri/src/db.rs` (`get_transactions_aggregate_by_category`, `get_transactions_aggregate_by_date`). These return JSON-friendly aggregated shapes.

## Data / API Contract
- New backend command: `get_transactions_aggregate_by_category(filter?: GetTransactionsFilter) -> Vec<CategoryAggregate>`
  - CategoryAggregate (Rust): `{ category_id: Option<String>, total_amount_cents: i64 }`
  - TypeScript wrapper: `getTransactionsAggregateByCategory(filter?: TransactionsFilter): Promise<{ categoryId?: string; totalAmountCents: number }[]>`
- New backend command: `get_transactions_aggregate_by_date(filter?: GetTransactionsFilter, interval: 'day'|'week'|'month'|'year') -> Vec<DateAggregatePerCategory>`
  - We will provide a payload shaped for stacked chart consumption. Two valid options:
    1. Backend returns flattened rows: `{ bucket: string, categoryId?: string, totalAmountCents: i64 }[]` — frontend will pivot into series per category keyed by `bucket`.
    2. Backend returns nested object: `{ bucket: string, totalsByCategory: { [categoryId:string]: i64 } }[]` — frontend uses directly.
  - Engineer pick: implement (1) to keep SQL simple and pivot in TS.
  - TypeScript wrapper: `getTransactionsAggregateByDate(filter?: TransactionsFilter, interval: 'day'|'week'|'month'|'year'): Promise<{ bucket: string; categoryId?: string; totalAmountCents: number }[]>`

## Commands touched (explicit table)
- `get_transactions` — unchanged
- `get_transactions_paginated` — unchanged
- `get_transactions_aggregate_by_category` — NEW (exposed via Tauri `#[command]`) — Signature added: `(filter: Option<GetTransactionsFilter>) -> Result<Vec<CategoryAggregate>, String>`
- `get_transactions_aggregate_by_date` — NEW (exposed via Tauri `#[command]`) — Signature added: `(filter: Option<GetTransactionsFilter>, interval: String) -> Result<Vec<DateAggregateRow>, String>`

Notes: The DB helpers `get_transactions_aggregate_by_category` and `get_transactions_aggregate_by_date` already exist in `src-tauri/src/db.rs`. The change is to add thin `#[command]` wrappers in `src-tauri/src/commands.rs` that adapt the existing `GetTransactionsFilter` to the DB helper params and return the serialized rows.

## Frontend file changes (suggested)
- Add: `src/pages/Dashboard.tsx` — page container and route registration in `src/main.tsx` or `src/App.tsx`.
- Add: `src/components/VisualizationToolbar.tsx` — reuses `TransactionFilters` inputs and adds chart-toggle + bucket selector.
- Add: `src/components/PieChartView.tsx` — renders pie, legend, hover tooltip.
- Add: `src/components/StackedBarView.tsx` — renders stacked bars by bucket and category, hover tooltip.
- Add: `src/lib/filters.tsx` — `FiltersContext` + hook `useFilters()` that reads/writes URL query params.
- Update: `src/services/tauri-api.ts` — add `getTransactionsAggregateByCategory` and `getTransactionsAggregateByDate` wrappers.
- Update: `src/App.tsx` / `src/main.tsx` — add route `/dashboard` and navigation link.

## Backend changes (suggested)
- Add these two `#[command]` functions to `src-tauri/src/commands.rs`:
  - `pub fn get_transactions_aggregate_by_category(filter: Option<GetTransactionsFilter>) -> Result<Vec<CategoryAggregate>, String>`
  - `pub fn get_transactions_aggregate_by_date(filter: Option<GetTransactionsFilter>, interval: String) -> Result<Vec<DateAggregateRow>, String>`
- Define `DateAggregateRow` serialization shape (if needed) or reuse `db::DateAggregate` with slight adaptation (include category id when flattening). Implement SQL for weekly/yearly bucket using `strftime`:
  - day: `%Y-%m-%d`
  - month: `%Y-%m`
  - year: `%Y`
  - week: use `%Y-%W` (note: ISO-week edge cases acceptable for v1; document limitations).
- No change to existing commands signatures.

## Frontend Implementation Notes
- FiltersContext responsibilities:
  - store `{ startDate?, endDate?, categoryId? }`
  - expose `setFilters` and fine-grained setters
  - sync updates to URL query params (e.g. `?start=2026-07-01&end=2026-07-31&cat=...`)
  - when initialized, parse URL to prepopulate context
- Dashboard page flow:
  1. Read filters from `useFilters()`
  2. Call `getTransactionsAggregateByCategory(filter)` for pie view
  3. Call `getTransactionsAggregateByDate(filter, interval)` for stacked bar view
  4. Fetch `getCategories()` once to map category IDs → names for legend/tooltips
  5. Render charts and listen to hover/click callbacks for tooltips
- Chart interaction details:
  - Show tooltip content: category name, formatted currency (use `src/lib/money` formatting helper)
  - Legend click toggles category series visibility (optional enhancement)

## Testing Requirements
- Backend (Rust):
  - Unit tests for new `commands.rs` wrappers using temporary DB override (existing pattern in tests module). Validate aggregated numbers for small seeded DB.
  - Edge-case tests: empty date range, single category, negative amounts.
- DB (Rust):
  - Add unit tests for weekly/yearly bucketing to confirm grouping logic.
- Frontend (TSX):
  - Unit tests for `FiltersContext` (URL sync + setters) using vitest.
  - Component tests for `VisualizationToolbar` to ensure events call `setFilters`.
  - Component tests for `PieChartView` and `StackedBarView` to validate rendering when given sample aggregated data and that tooltips render expected text.
- Integration / E2E:
  - Playwright test: navigate to Transactions, set filters, open Dashboard, assert charts reflect the filter totals; change filter on Dashboard and assert Transactions list updates.

## Teaching Artifacts (required)
Per repo policy, the `@engineer` must produce learning artifacts for this feature in `docs/learning-artifacts.md` (append a section), containing:
1. One-paragraph summary of what changed and why.
2. Line-by-line explanation of new files and the key lines inside `src-tauri/src/commands.rs` and `src/lib/filters.tsx` for unfamiliar devs.
3. How to run and test locally (commands for dev server, run rust tests, run vitest, run playwright E2E).
4. Suggested follow-ups and references (e.g., `recharts` docs, SQLite strftime notes about week numbering).

## Tasks Checklist (for `@engineer`) — implement in this order
- [ ] Add Tauri command wrappers in `src-tauri/src/commands.rs` (two functions) and unit tests.
- [ ] Add TypeScript wrappers in `src/services/tauri-api.ts`.
- [ ] Implement `FiltersContext` in `src/lib/filters.tsx` (URL sync + provider).
- [ ] Create `src/pages/Dashboard.tsx` and register route.
- [ ] Create `VisualizationToolbar` that reuses `TransactionFilters` UX.
- [ ] Implement `PieChartView` and `StackedBarView` components using chosen chart library.
- [ ] Add frontend unit tests and Playwright E2E test verifying bi-directional filter sync.
- [ ] Add learning artifacts to `docs/learning-artifacts.md` as required by the project.
- [ ] Update `README.md` or `docs/ARCHITECTURE.md` with a short note about the new Dashboard and APIs.

## Implementation Hints and Edge Cases
- For weekly buckets use `strftime('%Y-%W', date)`; document that `strftime` week numbering may differ from ISO 8601.
- When category_id is null (uncategorized), display label `Uncategorized` in legend and treat its id as `null` key.
- Aggregate totals are stored in cents (integers). Convert to dollars using existing helper in `src/lib/money.ts` to avoid floating point issues.

## Estimated Implementation Notes
- Complexity: moderate (backend RPC small, frontend charts + shared state moderate)
- Rough dev estimate: 2–3 days for one engineer (including tests and teaching artifacts).

---

Please start a fresh session with the `@engineer` persona to implement this specification and run tests. The `@engineer` should clone this checklist as their working branch `feature/visualizations-dashboard` and follow the repo workflow described in `.github/copilot-instructions.md`.
