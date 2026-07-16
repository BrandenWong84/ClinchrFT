## Todo: Top 5 Implementation Specs

Summary
- Project: Windows-first Tauri (Rust) + React + TypeScript local personal-finance app.
- Storage: SQLite (migration present at db/migrations/0001_init.sql).
- Backend: Tauri commands live in src-tauri/src/commands.rs (placeholder commands returning stubs).
- Frontend: React + Vite; frontend->backend calls use `src/services/tauri-api.ts` invoking Tauri commands.
- Money handling: `src/lib/money.ts` uses integer cents conversion utilities (good).

Goal
- Provide clear, implementation-ready checklists for the top 5 features to build next. Each feature lists which parts must be implemented in the Tauri command layer (`src-tauri/src/commands.rs` and `src-tauri/src/db.rs`) and which are pure frontend/state work (`src/components/`, `src/pages/`, `src/services/`). Include tests and acceptance criteria.

Notes on architecture
- Tauri commands should be the single gateway to SQLite and local filesystem (no direct DB/file access from the renderer).
- Keep monetary math in integer cents (use `src/lib/money.ts`).
- Follow project workflow: feature branches named `feature/<short>` and produce small commits with tests.

Feature 1 — Transactions CRUD (core persistence)
- Priority: High
- Outcome: Full create/read/update/delete for transactions persisted in SQLite and exposed to the renderer.
- Tauri work:
  - Add DB helpers in `src-tauri/src/db.rs` (insert/update/select/delete for `transactions`).
  - Add Tauri commands in `src-tauri/src/commands.rs`: `create_transaction`, `update_transaction`, `delete_transaction`, `get_transactions` (with optional filters).
  - Run migrations/open DB under `%APPDATA%/ClinchrFT` (use existing `get_app_path` pattern to compute path).
  - Unit tests for DB helpers (Rust) if CI supports it.
- Frontend work:
  - Update `src/services/tauri-api.ts` with matching functions.
  - Implement `Transactions` UI: list, add/edit form, delete action in `src/pages/Transactions.tsx` and supporting components in `src/components/`.
  - Add form validation and use `src/lib/money.ts` for parsing/formatting.
  - Vitest tests for money util and UI state logic.
- Acceptance criteria:
  - Creating a transaction persists it to DB and shows immediately in list.
  - Editing updates DB and UI.
  - Deleting removes from DB and UI.

Feature 2 — Accounts & Categories CRUD
- Priority: High
- Outcome: Manage accounts and categories with referential integrity for transactions.
- Tauri work:
  - DB helpers/commands for `accounts` and `categories` (`create_account`, `get_accounts`, etc.).
  - Ensure foreign key constraints are handled on deletes (either prevent delete or cascade nullify category_id).
- Frontend work:
  - Add settings pages/components to manage accounts/categories (`src/pages/Settings` or `src/components/ManageAccounts.tsx`).
  - Integrate selects in transaction forms for account/category.
- Acceptance criteria:
  - Accounts and categories persist and appear in selectors when creating or editing transactions.

Feature 3 — Filtering & Querying (date range, category, account)
- Priority: Medium-High
- Outcome: Efficient filtered queries for large transaction sets and client-side UX for selecting ranges.
- Tauri work:
  - Extend `get_transactions` command to accept optional filter params (start_date, end_date, account_id, category_id) and return filtered results.
  - Add aggregate query commands if needed (sum by category/date range) for dashboards.
- Frontend work:
  - Add filter UI (date range picker, account/category dropdowns) in `src/pages/Transactions.tsx`.
  - Call filtered commands and render results; add loading states and empty states.
- Acceptance criteria:
  - Filters return correct, paginated results and UI reflects loading/empty states.

Feature 4 — CSV Import & Export, Local Backup
- Priority: Medium
- Outcome: Allow user to export transactions to CSV and import CSV files; provide a simple backup (copy DB) and restore flow.
- Tauri work:
  - Add commands for file dialogs and filesystem access: `export_transactions_csv`, `import_transactions_csv`, `create_backup`, `restore_backup`.
  - Implement robust parsing in Rust or use safe CSV crates to protect against bad input.
- Frontend work:
  - Add export/import UI and progress/confirmation modals.
  - Add small importer preview step to confirm mapping before commit.
- Acceptance criteria:
  - Export produces a valid CSV; import validates and shows preview before persisting.

Feature 5 — Basic Visualizations & Summary Dashboard
- Priority: Medium
- Outcome: Add trend charts and category breakdowns on a Dashboard page.
- Tauri work:
  - Optional: add aggregate endpoints (e.g., `get_spending_by_category(start,end)`) to let Rust run efficient SQL aggregates.
  - Alternatively, return raw filtered transactions and let the renderer aggregate.
- Frontend work:
  - Add `src/pages/Dashboard.tsx` and small chart components (pick a lightweight chart lib or simple SVG bars).
  - Use aggregated endpoints if available; otherwise compute aggregates in TypeScript using integer cents.
- Acceptance criteria:
  - Dashboard shows totals and a category breakdown for selected range; numbers use integer cents and formatted with `src/lib/money.ts`.

Cross-cutting tasks
- Tests: add unit tests for DB helpers (Rust) and frontend logic (Vitest). Add an end-to-end smoke test flow if desired.
- Security & Privacy: Ensure no telemetry; store DB under the application data path. Confirm `tauri.conf.json` allowlist covers only required commands (see existing scripts/tauri-allowlist-checker.js).
- Branching & PRs: Create `feature/<short>` branches, keep changes small, include teaching artifacts for any code change (summary + annotated explanation + run/test steps) per repo guidance.

Estimated initial effort (team of 1):
- Feature 1: 1.5–3 days
- Feature 2: 1–2 days
- Feature 3: 1–2 days
- Feature 4: 1–2 days
- Feature 5: 1–2 days

Next steps for @engineer
- Checkout a fresh session as `@engineer` and implement Feature 1 (Transactions CRUD) first.
- Use branch name `feature/transactions-crud` and open a PR with tests and teaching artifacts.

---
Please switch to a fresh session with the `@engineer` persona to execute these checklists and implement the features.
