# Todo: Accounts & Categories CRUD Implementation

Summary
- Goal: Implement full create/read/update/delete (CRUD) for `accounts` and `categories`, wire them into the Transactions UI, and ensure referential integrity for `transactions`.
- Outcome: Users can manage accounts and categories from the frontend; transactions reference these entities and UI selectors reflect current lists.
- Planner rule: Explicitly separate Tauri (Rust) work from frontend work — follow `docs/AGENTS.md` runtime boundaries.

Acceptance criteria
- Create/update/delete accounts and categories persist to SQLite and are returned by Tauri commands.
- Transaction creation and editing present current account/category options in the UI.
- Deleting an account or category either prevents delete (if in-use) or nullifies/handles references according to chosen policy.
- Tests: Rust DB helper tests and Vitest frontend tests validate behavior.

Data model (suggested)
- `accounts` table: `id INTEGER PRIMARY KEY`, `name TEXT NOT NULL`, `type TEXT`, `notes TEXT`, `created_at DATETIME`
- `categories` table: `id INTEGER PRIMARY KEY`, `name TEXT NOT NULL`, `parent_id INTEGER NULL`, `notes TEXT`, `created_at DATETIME`
- `transactions` table: ensure `account_id` and `category_id` are nullable FK referencing the above tables.
- Migration: add `db/migrations/0002_accounts_categories.sql` (engineer creates file with proper SQL).

High-level tasks (checklist)
- Tauri / Rust (pinned to `src-tauri/`)
  - [ ] Add DB migration file: `db/migrations/0002_accounts_categories.sql` with `CREATE TABLE` statements and FK constraints.
  - [ ] Update `src-tauri/src/db.rs`:
    - [ ] Add helpers: `create_account`, `update_account`, `delete_account`, `get_accounts`.
    - [ ] Add helpers: `create_category`, `update_category`, `delete_category`, `get_categories`.
    - [ ] Ensure `get_transactions` (if already implemented) supports nullable `account_id`/`category_id` and returns names where convenient or returns ids and let frontend look up names.
  - [ ] Update `src-tauri/src/commands.rs`:
    - [ ] Expose Tauri commands: `create_account`, `update_account`, `delete_account`, `get_accounts`, `create_category`, `update_category`, `delete_category`, `get_categories`.
    - [ ] Implement safe delete policy: either block delete when referenced (return specific error) or implement `ON DELETE SET NULL` semantics; document chosen policy.
  - [ ] Add Rust unit tests for DB helpers in `src-tauri/src/db.rs` or `tests/` verifying insert/select/update/delete and FK behavior.

  Files touched (Tauri):
  - `src-tauri/src/db.rs`
  - `src-tauri/src/commands.rs`
  - `db/migrations/0002_accounts_categories.sql` (new file)

- Frontend / Renderer (React + TypeScript)
  - [ ] Update `src/services/tauri-api.ts`:
    - [ ] Add typed wrapper functions that call the new Tauri commands and return typed results (use `src/types/index.ts` models).
  - [ ] Add/manage components and pages:
    - [ ] `src/components/ManageAccounts.tsx` (CRUD UI for accounts) or a settings page component.
    - [ ] `src/components/ManageCategories.tsx` (CRUD UI for categories) with optional parent/category tree handling.
    - [ ] Update `src/components/TransactionForm.tsx` to fetch `accounts` and `categories` and render selects for `account_id` and `category_id` (maintain existing validation patterns).
    - [ ] Update `src/pages/Transactions.tsx` to refresh lists after create/update/delete of accounts/categories (or subscribe to a change event/store update).
  - [ ] Add frontend tests (Vitest + React Testing Library) to `tests/` validating:
    - [ ] `tauri-api` wrapper returns expected shapes (mock `window.__TAURI__` or the existing test harness).
    - [ ] `TransactionForm` shows account/category options and correctly submits an id.
    - [ ] `ManageAccounts` and `ManageCategories` basic CRUD flows (render, add, edit, delete, error handling).

  Files touched (Frontend):
  - `src/services/tauri-api.ts`
  - `src/components/ManageAccounts.tsx` (new)
  - `src/components/ManageCategories.tsx` (new)
  - `src/components/TransactionForm.tsx` (update)
  - `src/pages/Transactions.tsx` (update)
  - `tests/` (update/add relevant frontend tests)

API shapes (suggested TypeScript interfaces)
- `Account`: `{ id: number; name: string; type?: string | null; notes?: string | null; created_at?: string }`
- `Category`: `{ id: number; name: string; parent_id?: number | null; notes?: string | null; created_at?: string }`

Error handling and UX
- Tauri commands must return structured errors for:
  - `ConstraintViolation` (e.g., trying to delete a referenced account/category).
  - `NotFound` for updates/deletes on missing ids.
- Frontend should show concise user-facing messages and avoid raw error dumps.

Referential-delete policy (pick one; record choice in PR)
- Option A (recommended): `ON DELETE SET NULL` for `transactions.account_id`/`category_id`. Deleting an account/category is allowed and transactions stay readable with nulls.
- Option B: Prevent deletion while referenced and require user to reassign or delete dependent transactions.

Security & privacy
- No network/telemetry code. Keep DB under `%APPDATA%/ClinchrFT`.
- Update `tauri.conf.json` allowlist only if new commands require additional permissions; follow existing allowlist-checker scripts.

Developer notes & tests run checklist (engineer must run locally)
- Run `npx tsc --noEmit` and fix type issues.
- Run `npm test` and fix failing frontend tests.
- Run `cargo test` inside `src-tauri` for Rust unit tests.
- Run the app and manually verify flows at `http://localhost:5173`.

Teaching artifacts (required by repo policy)
- For every engineering commit or PR that modifies code, include in the PR description or `docs/learning-artifacts.md`:
  1. One-paragraph summary of what changed and why.
  2. Line-by-line explanation for unfamiliar developers (or an annotated diff snippet).
  3. How to run and test the change locally (commands).
  4. Suggested follow-up learning items or references.

Branching & PR
- Branch name: `feature/accounts-categories-crud`
- Keep commits small and focused: migration + Rust helpers, commands, API wrappers, frontend components, tests.
- Open PR and ensure CI runs `npx tsc --noEmit`, `npm test`, and `cargo test` (where applicable).

Estimated effort (single engineer)
- Tauri DB + commands + tests: 6–10 hours
- Frontend UI + tests + integration: 8–14 hours

Notes for the `@engineer` agent
- Follow `docs/AGENTS.md` runtime separation strictly.
- Create the DB migration as `db/migrations/0002_accounts_categories.sql` and include a short note in the migration header about the chosen referential-delete policy.
- Update `src/services/tauri-api.ts` immediately after adding Tauri commands to keep signatures in sync.
- Include the required teaching artifacts with the PR.

---

Next step: switch to a fresh session as `@engineer` to implement this checklist.
