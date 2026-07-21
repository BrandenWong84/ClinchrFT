---

Change: Account-selection UX and persistent active account
- One-paragraph summary:
	- Implemented a persistent account selector on the Transactions page so users can choose an "active" account. Transactions are created and listed for the selected account by default, and the last selection is persisted in `localStorage` under the key `clinchrft:lastAccountId`. A Tauri command `create_account` was added so the frontend can create a `default` account when the app has no accounts.
- Line-by-line explanation:
	- `src-tauri/src/commands.rs`: added `create_account(name: String, notes: Option<String>) -> Result<AccountRow, String>` which wraps `crate::db::insert_account(...)` and is exposed as a Tauri command.
	- `src-tauri/src/main.rs`: registered `commands::create_account` in the Tauri invoke handler list.
	- `src/services/tauri-api.ts`: added `createAccount(name: string, notes?: string)` wrapper that calls the Tauri command when available and provides a `localStorage`-backed mock in dev.
	- `src/pages/Transactions.tsx`: added an account dropdown with an explicit `Unassigned` option, persisted last selection in `localStorage`, created a `default` account when no accounts exist, filtered transactions client-side by the selected account, and passed the selected account to the create transaction flow so `account_id` is recorded (or `NULL` when Unassigned).
	- `src/components/TransactionForm.tsx`: removed the free-text account input — the form no longer accepts arbitrary account ids. The form uses the parent-provided `selectedAccountId` (or the transaction's existing account when editing) and converts empty selection to `undefined` before submitting.
- How to run and test locally (commands):

```powershell
# Rust tests
cd src-tauri
cargo test

# TypeScript checks and frontend tests (repo root)
npx tsc --noEmit
npm test

# Run the app and manually verify behavior
npm run tauri
# Open Transactions page; verify dropdown, create transaction (assigned/unassigned), and that selection persists after reload
```
- Suggested follow-up learning items or references:
	- Review Tauri command exposure and the security surface of adding new commands.
	- Consider enhancing the account dropdown with a "Create account" action/modal and soft-delete handling (show "(deleted)" label).
- Implementation TODOs / Reviewer handoff:
 - Implementation TODOs / Reviewer handoff:
	- Run `cargo test`, `npx tsc --noEmit`, and `npm test` to verify no regressions.
	- Manually verify Transactions page: dropdown shows `Unassigned` + accounts, selecting an account filters transactions, creating a transaction assigns `account_id` appropriately, and the default account is created on first-run when no accounts exist.
	- Pay attention to the mock behavior in `src/services/tauri-api.ts` when running `npm run dev` — the mock stores accounts/transactions in `localStorage` under `clinchrft:mock:db_v1`.
Change: Fix tests and make frontend accept nullable account/category
- One-paragraph summary:
	- Adjusted backend tests to create required `accounts` and `categories` before inserting `transactions` so SQLite FK constraints (with `ON DELETE SET NULL`) pass in tests. Updated frontend TypeScript types and UI so `accountId` and `categoryId` are optional; the `TransactionForm` allows empty selection and converts empty strings to `undefined` on submit; the `Transactions` page resolves account/category names and displays `Unassigned / Deleted` when a reference is missing or soft-deleted.
- Line-by-line explanation:
	- `src-tauri/src/db.rs` (tests): `crud_roundtrip` now calls `insert_account` and `insert_category` to create parent rows, then inserts a transaction using their IDs.
	- `src-tauri/src/commands.rs` (tests): test now opens the temp DB, inserts an account and category, then creates a transaction using those IDs.
	- `src/types/index.ts`: made `Transaction.accountId` optional.
	- `src/components/TransactionForm.tsx`: removed `required` from account input and converted empty strings to `undefined` when submitting.
	- `src/pages/Transactions.tsx`: loads `accounts` and `categories`, builds maps, and passes them to `TransactionList`.
	- `src/components/TransactionList.tsx`: added `Account` and `Category` columns; resolves names via provided maps and displays `Unassigned / Deleted` when appropriate.
- How to run and test locally (commands):

```powershell
# Rust tests
cd src-tauri
cargo test

# TypeScript checks and frontend tests (repo root)
npx tsc --noEmit
npm test
```
- Suggested follow-up learning items or references:
	- Review how SQLite enforces foreign keys and the interaction of `ON DELETE SET NULL` with soft-deletes.
	- Consider replacing free-text account/category inputs with `<select>` elements listing current accounts/categories plus an explicit `Unassigned` option.
- Implementation TODOs / Reviewer handoff:
	- Frontend changes implemented; reviewer should verify backend `get_transactions` returns `PaginatedTransactions` shape.

---

Change: Frontend — Transactions filtering, paging, and UI wiring
- One-paragraph summary:
	- Implemented the frontend portion of server-driven transaction filtering and pagination: added a small `TransactionFilters` component, wired the `Transactions` page to call `getTransactionsPaged(filters)`, and added Prev/Next pagination controls plus loading/empty states. Tests were updated to mock the paged API.
- Line-by-line explanation:
	- `src/pages/Transactions.tsx`: added local state for `startDate`, `endDate`, `selectedCategoryId`, `limit`, `offset`, and `total`. Replaced client-side filtering logic with `fetchTransactions()` that calls `getTransactionsPaged(...)` and sets `transactions` from the server response. Added UI wiring for filter apply/clear and changed the Add Transaction flow to re-fetch the current page after mutations.
	- `src/components/TransactionFilters.tsx`: new presentational component exposing date inputs, category select, and Apply/Clear buttons. It lifts selected values to the parent via callbacks.
	- `tests/transactions-page.test.tsx`: updated to mock `getTransactionsPaged` and preserved previous behavioral tests (account repair, FK error handling on create).
- How to run and test locally (commands):

```powershell
# TypeScript checks
npx tsc --noEmit

# Run frontend unit tests (Vitest)
npm test

# Run the app in dev mode
npm run dev
```
- Suggested follow-up learning items:
	- Add a page-size selector and direct page navigation.
	- Consider keyset pagination for better performance on large datasets.
	- Add debounce for free-text memo search and consider FTS for better text search.
- Reviewer handoff checklist:
	- Verify that the Tauri backend exposes `get_transactions` returning `{ items, total, limit, offset }`.
	- Run `npx tsc --noEmit` and `npm test` to validate no regressions.
	- Manually exercise the Transactions UI in `npm run dev`: apply filters, page forward/back, and confirm expected results.

	- Run `cargo test` and confirm all Rust tests pass.
	- Run `npx tsc --noEmit` and `npm test` to confirm frontend typechecks and tests pass.
	- Manually verify Transactions page shows `Unassigned / Deleted` for null/missing account/category and that TransactionForm can save transactions without an account.
Change: Add Accounts & Categories CRUD (soft-delete + ON DELETE SET NULL)
- One-paragraph summary:
	- Implemented backend CRUD helpers for `accounts` and `categories` in `src-tauri/src/db.rs`, exposed corresponding Tauri commands in `src-tauri/src/commands.rs`, and updated the runtime migrations to use `ON DELETE SET NULL` for `transactions` so deleting an account or category will not remove historical transactions. Deletions are implemented as soft-deletes via a `deleted_at` timestamp on `accounts`/`categories` so the UI can confirm and optionally undelete.
- Line-by-line explanation:
	- `src-tauri/src/db.rs`:
		- Added `AccountRow` and `CategoryRow` structs (serializable) and CRUD helpers: `get_accounts`, `insert_account`, `update_account`, `delete_account`, `get_categories`, `insert_category`, `update_category`, `delete_category`.
		- Updated `TransactionRow` to allow `account_id` to be nullable (`Option<String>`) and adjusted `CreateTransaction`/`UpdateTransaction` types accordingly so transactions can reference NULL after deletes.
		- `run_migrations()` now creates tables with `ON DELETE SET NULL` on the `transactions` foreign keys and adds `deleted_at` audit columns for soft-deletes.
	- `src-tauri/src/commands.rs`:
		- Replaced stubbed account/category commands with wrappers that open the DB and call the new helpers, returning structured rows to the frontend.
	- `db/migrations/0002_accounts_categories.sql`:
		- Describes the intended schema changes (adds audit columns and documents the `ON DELETE SET NULL` policy). The runtime migrations in `db.rs` ensure the schema on startup.
- How to run and test locally (commands):

```powershell
# Frontend-only dev
npm run dev

# Full backend + frontend (requires Rust toolchain)
npm run tauri

# Run Rust unit tests for DB helpers
cd src-tauri
cargo test
```
- Suggested follow-up learning items or references:
	- Review SQLite foreign key semantics and `ON DELETE` behavior.
	- Learn about soft-delete patterns and audit fields in local apps.
- Implementation TODOs / Reviewer handoff:
	- Run `cargo test` in `src-tauri` and `npm test` in the repo root.
	- Verify the frontend `TransactionForm` is updated to accept `account_id`/`category_id` being optional and that the UI treats nulls as `Unassigned` or `Deleted`.
	- Confirm that the migration file `0002_accounts_categories.sql` matches reviewer expectations for on-disk migrations (the runtime runner enforces schema at startup).


Change: Make `tauri-api` dev-safe with localStorage mock fallback
- One-paragraph summary:
	- Replaced the static `@tauri-apps/api/core` usage in `src/services/tauri-api.ts` with a runtime-detected wrapper. When Tauri is present the code dynamically imports and calls `invoke(...)`. When Tauri is absent (browser/dev) and not in production, a lightweight mock backed by `localStorage` provides transactions/accounts/categories so the UI runs without uncaught `invoke` errors.
- Line-by-line explanation:
	- `isTauriAvailable()`: feature-detects the Tauri runtime via `window.__TAURI_INTERNALS__` safely.
	- Dynamic `import('@tauri-apps/api/core')`: performed only when Tauri is available to avoid module runtime errors in browsers.
	- Dev mock (`localStorage`): implements CRUD for transactions and persists to `localStorage` under the key `clinchrft:mock:db_v1` so frontend flows (Add Transaction, list) work in `npm run dev`.
	- Production safety: when `process.env.NODE_ENV === 'production'` and Tauri is absent, the API returns safe defaults or throws where appropriate to avoid silently masking errors in packaged apps.
- How to run and test locally (commands):

```powershell
# Frontend-only dev server
npm run dev
# Open http://localhost:5173 in your browser and use the Transactions page — console should show no uncaught Tauri errors

# Run unit tests (Vitest)
npm test
```
- Suggested follow-up learning items or references:
	- Read about dynamic imports in ES modules and how bundlers handle them.
	- Review Tauri runtime internals and `@tauri-apps/api` behavior on import.
	- Consider adding a pluggable provider pattern (DI) to swap mocks and real providers more cleanly.
- Implementation TODOs / Reviewer handoff:
	- Verify `npm run dev` opens in the browser and the Transactions page allows creating transactions (persisted to `localStorage`).
	- Run `npm test` and confirm `tests/tauri-api.test.ts` passes in both mocked Tauri and non-Tauri scenarios.
	- If desired, extend the mock to emulate server-side validation or to seed more realistic sample data for developer demos.


Change: Add `build.devPath` to `src-tauri/tauri.conf.json` to enable `tauri dev`
- One-paragraph summary:
	- Added `build.devPath` pointing at the running Vite dev server (`http://localhost:5173`) so `tauri dev` uses the live dev server instead of requiring an on-disk `dist` folder. This prevents `tauri::generate_context!()` from panicking when `build.frontendDist` (`../dist`) is absent during development.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json` `build.devPath`: set to `http://localhost:5173` which tells the Tauri dev process to load the renderer from the Vite dev server during `tauri dev` runs.
	- `build.frontendDist` remains `../dist` for production builds (packaging), while `devPath` is only used in development.
	- `build.beforeDevCommand`: left as `npm run dev` to ensure Vite is started before Tauri attempts to connect to `devPath`.
- How to run and test locally (commands):

```powershell
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
# Start full Tauri dev (this will run the `beforeDevCommand` and point the app at the Vite server)
npm run tauri
```

- Expected outcome:
	- Vite starts on `http://localhost:5173` and Tauri connects to that address; `tauri::generate_context!()` will not panic about a missing `../dist` folder during development.
- Reviewer next steps / handoff:
	- Verify `npm run tauri` no longer panics with `The "frontendDist" configuration is set to "../dist" but this path doesn't exist`.
	- If the project uses a non-default Vite port, update `build.devPath` accordingly.
	- Optionally, if you prefer the alternative workaround, create an empty `dist` folder or run `npm run build` prior to `npm run tauri`.

Change: Ignore `src-tauri/target` in Vite watcher to avoid Windows EBUSY
 - One-paragraph summary:
	 - Added a Vite server watch ignore pattern to prevent Vite from attempting to watch Cargo build artifacts under `src-tauri/target`. On Windows those files can be locked/executing during `cargo` builds and cause `EBUSY` errors that crash the dev flow (`npm run tauri`). This change keeps the frontend watcher focused on source files only.
 - Line-by-line explanation:
	 - `vite.config.js` `server.watch.ignored`: adds the glob `**/src-tauri/target/**` so Vite (chokidar) will not try to watch the Cargo `target` tree. This avoids errors when build scripts create/execute files in that folder.
 - How to run and test locally (commands):

```powershell
# validate tauri config + allowlist checker (unchanged steps)
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js

# Start Tauri dev (should no longer error with EBUSY from watcher)
npm run tauri
```
 - Expected outcome:
	 - Vite starts its dev server without an `EBUSY` watcher error; Cargo can build native artifacts under `src-tauri/target` without interfering with Vite's file watcher.
 - Suggested follow-up learning items or references:
	 - Read chokidar/watchman docs and Vite's watcher configuration options.
	 - If other build artifacts are created elsewhere, add similar ignore globs to `vite.config.js`.
 - Reviewer next steps / handoff to `@reviewer`:
	 - Pull the change, run the commands above on Windows, and confirm `npm run tauri` completes without the previous EBUSY watcher error.
	 - If the error persists, capture the dev logs and consider also excluding other generated folders (e.g., `**/target/**`), or running the frontend and Cargo builds as separate processes during development.
Run Locally — Checklist

One-paragraph summary:
 - A concise developer checklist for running the project locally: frontend-only via Vite for fast UI iteration, and full Tauri dev for desktop + Rust backend flows. Includes commands, prerequisites, and acceptance criteria so reviewers can validate the environment and CRUD behavior without surprises.
Line-by-line explanation / mapping:
 - `npm install`: install JS dependencies for the frontend and tooling.
 - `npm run dev`: starts the Vite dev server and serves the React app in a browser (no Tauri backend).
 - `npm run tauri`: runs the Tauri dev flow (frontend + Rust backend) using the local `@tauri-apps/cli` binary; requires Rust toolchain and Windows build tools to compile native parts.
 - `CLINCHRFT_DB_PATH` env var: optional override for the SQLite DB file location used by the Rust backend for easier test isolation.

How to run and test locally (commands):
```powershell
# Install JS deps
npm install

# Frontend-only (fast iteration)
npm run dev
# open http://localhost:5173

# Full desktop + backend (requires Rust toolchain + MSVC build tools)
npm run tauri
```

Acceptance criteria (manual checks for reviewer):
 - Frontend-only run (`npm run dev`) shows the app UI and top-level header.
 - Full Tauri run (`npm run tauri`) launches a desktop window and the Transactions page loads without unhandled `invoke` errors.
 - Creating/updating/deleting a transaction in the UI persists to the SQLite DB (check the DB file under the OS app-data folder or use `CLINCHRFT_DB_PATH` to point to a temp file and inspect it).

Reviewer next steps / handoff to `@reviewer`:
 - On a Windows dev machine with Rust + MSVC installed, run the commands above and confirm the acceptance criteria.
 - If `npm run tauri` fails, capture the output and verify the Rust toolchain, `@tauri-apps/cli` availability, and Visual Studio Build Tools presence.
 - Attach any dev logs or `cargo test` output to the PR for traceability.

Implementation note for this change:
 - Added a short `Developer Quickstart` to the repository `README.md` and appended this checklist to `docs/learning-artifacts.md` so reviewers and contributors have a minimal, copy-pasteable set of steps to run the project locally.

ClinchrFT — Learning Artifacts

This file contains the teaching artifacts and the template that should accompany implementation changes.

1) One-paragraph summary of the change
- (Example) Added a minimal project scaffold that includes a frontend React + TypeScript app, Rust Tauri backend stubs, a first SQLite migration, and basic test scaffolding. The scaffold provides the IPC command names and simple implementations so frontend and backend can be iterated on together.

2) Line-by-line explanation (or annotated code) for unfamiliar developers
- `package.json`: project metadata and scripts for dev/build/test.
- `tsconfig.json`: TypeScript compiler options for the frontend.
- `.gitignore`: common ignores for node, build artifacts, and editor files.
- `src/`: React app entry (`main.tsx`), `App.tsx`, a demo `Transactions` page, basic types, money helpers, and a Tauri API wrapper.
- `public/index.html`: HTML entry for Vite/static dev server.
- `tests/money.test.ts`: unit test for money helpers.
- `db/migrations/0001_init.sql`: initial SQL schema for transactions, accounts, categories.
- `src-tauri/`: Rust Tauri project with `main.rs`, `commands.rs` stubs, `db.rs` helper, `Cargo.toml`, and `tauri.conf.json`.

3) How to run and test locally (commands)
- Install JS deps and run the frontend dev server:

```bash
npm install
npm run dev
```

- Run Tauri dev (separate terminal; requires Rust + Tauri toolchain on Windows):

```bash
cd src-tauri
cargo install tauri-cli --locked   # if not already installed
cargo tauri dev
```

- Run frontend unit tests:

```bash
npm test
```

4) Suggested follow-up learning items or references
- Implement a migrations runner in `src-tauri/src/db.rs` that executes SQL files from `db/migrations/` at startup.
- Replace frontend mock data with `invoke` calls to Tauri commands and add error handling.
- Add CI to run `npm test` and `cargo test`.

5) Implementation TODOs (for engineers)
- Create feature branch `feature/scaffold` and commit small, focused changes.
- Implement migration executor and persistent DB path under `%APPDATA%/ClinchrFT`.
- Add CRUD commands in `src-tauri/src/commands.rs` and corresponding frontend wrappers in `src/services/tauri-api.ts`.

---

Change: Migrate `src-tauri/tauri.conf.json` to Tauri v2 schema and make the allowlist checker robust
- One-paragraph summary:
	- Updated `src-tauri/tauri.conf.json` to the Tauri v2 configuration shape (top-level `productName`, `version`, `identifier`, `build.frontendDist`, `app`, and `bundle`) so the installed `@tauri-apps/cli` can parse and accept the file. Removed an unsupported top-level `allowlist` block (the v2 schema doesn't expect it). Also updated `scripts/tauri-allowlist-checker.js` to detect an allowlist if present in either the legacy (`tauri.allowlist`) or alternative (`allowlist`) shapes so the checker remains useful without forcing an invalid config shape.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json`: moved `productName`/`version` from `package`, moved `identifier` from `tauri.bundle`, replaced `devPath`/`distDir` with `build.frontendDist` and `beforeDevCommand`/`beforeBuildCommand`, added a minimal `app.windows` entry and `bundle.active` to satisfy the schema. Removed `allowlist` because the CLI rejected that top-level key.
	- `scripts/tauri-allowlist-checker.js`: replaced the previous direct access to `tauriConf.tauri.allowlist` with a tolerant lookup that prefers `tauriConf.tauri.allowlist` but falls back to `tauriConf.allowlist`. The script still writes `allowlist-report.json` and only exits non-zero when `all: true` is detected in the discovered allowlist object.
- How to run and test locally (commands):

```powershell
# Validate JSON and run the allowlist checker
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js

# Confirm Tauri CLI accepts the updated config
npx tauri info --verbose > tauri-info.log 2>&1
``` 

- Reviewer next steps / handoff:
	- Verify `npx tauri info --verbose` completes without schema validation errors (attach `tauri-info.log`).
	- Note: after this change `npx tauri info` may surface version mismatches between the Rust crates and NPM packages (e.g., `tauri` crate v1 vs `@tauri-apps/api` v2). If you want to update crate/npm versions to align major versions, do that in a follow-up PR and document the security/compat rationale.


Template: For every subsequent change, include the following sections in a `docs/learning-artifacts.md` entry or separate file attached to the PR:

- One-paragraph summary
- Line-by-line explanation / annotated code
- How to run and test locally (commands)
- Suggested follow-up learning items
- Implementation TODOs

---

6) Change: Add Tauri build script to enable `cargo test`
- One-paragraph summary:
	- Added `src-tauri/build.rs` and a `build-dependencies` entry for `tauri-build` in `src-tauri/Cargo.toml`. This ensures `tauri_build::build()` runs at build time, producing the generated context files required by `tauri::generate_context!()` so `cargo test` and other compile-time operations succeed.
- Line-by-line explanation:
	- `src-tauri/build.rs`: defines `fn main()` which calls `tauri_build::build();` — this invokes the Tauri build helper to process `tauri.conf.json` and bundle assets into the compiler `OUT_DIR`.
	- `src-tauri/Cargo.toml` addition: the `[build-dependencies]` table includes `tauri-build` so the build script can link and call into the helper at compile time.
- How to run and test locally (commands):

```bash
cd src-tauri
cargo clean
cargo test --verbose 2>&1 | Out-File -FilePath '..\\cargo-test.log' -Encoding utf8
``` 

- Suggested follow-up learning items:
	- Read Tauri's build-time codegen docs and `generate_context!()` macro behavior.
	- Explore `OUT_DIR` usage in Rust build scripts and how generated artifacts are discovered by macros.
- Implementation TODOs for reviewer / next steps:
	- Verify `tauri.conf.json` exists at project root or `src-tauri/` and is valid JSON.
	- Run `cargo test` on Windows with MSVC toolchain installed; if linking issues occur, ensure Visual Studio Build Tools and WebView2 runtime are present.
	- If CI runs on non-Windows runners, consider gating Tauri-native tests or using feature flags to allow cross-platform test runs.

9) Change: Add Tauri allowlist checker and CI enforcement
- One-paragraph summary:
	- Added a repository-level checker script (`scripts/tauri-allowlist-checker.js`), updated the CI workflow to run frontend and Rust tests and then the checker, and added a PR checklist item to require documenting any Tauri allowlist changes. The checker produces `allowlist-report.json` and fails CI if `tauri.conf.json` uses `allowlist.all: true` so reviewers can enforce a minimal allowlist.
- Line-by-line explanation:
	- `scripts/tauri-allowlist-checker.js`: static Node script that scans `src/` for common Tauri API usage patterns and `src-tauri/src/` for `#[tauri::command]` functions; writes `allowlist-report.json` at repo root and exits non-zero when `tauri.conf.json` has `tauri.allowlist.all: true`.
	- `.github/workflows/ci.yml` (updated): installs Node deps, runs frontend tests (`npx vitest run`), sets up Rust and runs `cargo test`, then runs the allowlist checker step.
	- `.github/PULL_REQUEST_TEMPLATE.md` (updated): adds a checklist line `tauri allowlist updated & justified` to ensure PR authors document any add/remove of native API usage.

- How to run and test locally (commands):

```bash
npm ci
npx vitest run
cd src-tauri && cargo test --verbose
cd ..
node scripts/tauri-allowlist-checker.js
```

- Suggested follow-up learning items:
	- Review Tauri `tauri.conf.json` allowlist keys and map frontend `@tauri-apps/api` usage to required keys.
	- Run the checker after adding any new Tauri API usage and include the `allowlist-report.json` in the PR description.

- Implementation TODOs (for engineers / reviewers):
	- Run the checker and inspect `allowlist-report.json` to create a minimal `src-tauri/tauri.conf.json` allowlist (do not set `all: true`).
	- Document mapping decisions in the PR description: which frontend calls require which allowlist keys and why.
	- Consider adding the checker execution result as an artifact in CI for easy review.

---

Change: Migrate repository to strict ESM alignment (TypeScript + Node)
- One-paragraph summary:
	- Updated TypeScript and Node runtime resolution to ESM-friendly settings to improve forward compatibility: `tsconfig.json` now uses `module: ESNext` and `moduleResolution: nodeNext`; `package.json` is set to `type: "module"`. Node-only tooling scripts that rely on CommonJS were converted to `.cjs` to preserve runtime behavior.
- Line-by-line explanation:
	- `tsconfig.json`: `module` → `ESNext` enables emitting modern ES module syntax; `moduleResolution` → `nodeNext` aligns TypeScript resolution with Node's ESM semantics.
	- `package.json`: adding `type: "module"` tells Node to treat `.js` files as ESM by default; to keep existing CommonJS scripts working we added `.cjs` variants for Node tooling.
	- `scripts/*.cjs`: created `scripts/tauri-allowlist-checker.cjs` and `scripts/validate-tauri-conf.cjs` (copies of the previous CommonJS code) so `node` can execute them unchanged even with `type: "module"` set.
	- `tests/checker.test.js`: updated to call the new `.cjs` script path.
	- `.github/workflows/ci.yml`: pinned Node to `18` and updated the allowlist checker step to call the `.cjs` script.
- How to run and test locally (commands):

```powershell
git checkout -b feature/es-module-migration
npm ci
npx tsc --noEmit
npm test
node scripts/tauri-allowlist-checker.cjs
node scripts/validate-tauri-conf.cjs
```

- Suggested follow-up learning items or references:
	- Read Node ESM docs and TypeScript `moduleResolution: nodeNext` guidance.
	- Review the tradeoffs of `type: "module"` vs per-file `.mjs`/`.cjs` strategies.
	- If additional Node scripts are present, review each for CommonJS `require` usage and either convert to ESM or add `.cjs` wrappers.
- Implementation TODOs / Reviewer handoff:
	- Run `npx tsc --noEmit` and ensure no compile errors.
	- Run `npm test` (Vitest) and confirm tests pass under the new config.
	- Inspect other repository docs and CI references for `scripts/tauri-allowlist-checker.js` and update to `.cjs` where appropriate.
	- Review whether `vite`/`vitest` config needs `deps.inline` adjustments for ESM interop; if tests report resolution errors, add `test: { deps: { inline: [] } }` to `vite.config.ts`.


---

Change: Align tests and TypeScript config with `Transaction` type
- One-paragraph summary:
	- Updated test fixtures in `tests/tauri-api.test.ts` to use `amountCents` and `memo` (matching `src/types/index.ts`) and updated `tsconfig.json` to use `moduleResolution: node16` so the TypeScript compiler uses a modern Node resolution strategy and avoids deprecation warnings.
- Line-by-line explanation:
	- `tests/tauri-api.test.ts`: replaced object literals and mocked Tauri responses that used `amount` → `amountCents` and `description` → `memo` so fixtures conform to the `Transaction` interface (`amountCents: number`, `memo?: string`).
	- `tsconfig.json`: changed `moduleResolution` from `node` to `node16` to align with current Node module resolution semantics (improves ESM interop and removes deprecation warnings about `node` resolution mode).
- How to run and test locally (commands):

```powershell
npm ci
npx tsc --noEmit
npm test
```

- Expected outcomes:
	- `npx tsc --noEmit` should report no type errors related to the `Transaction` fixtures.
	- `npm test` should run the Vitest suite and pass the modified `tauri-api.test.ts` scenarios.
- Suggested follow-up learning items:
	- Review the `Transaction` type at [src/types/index.ts](src/types/index.ts#L1-L7) and prefer `amountCents` for monetary values to avoid floating-point errors.
	- Read TypeScript's `moduleResolution` docs and Node's ESM/CJS resolution differences.
- Implementation TODOs / Reviewer handoff:
	- Verify the tests pass locally on Windows using the commands above.
	- Confirm there are no remaining fixtures in other test files using `amount`/`description` (search for `amount:` across `tests/`).
	- Open a PR titled `fix(tests): align transaction fixture fields with Transaction type` and include these verification steps in the PR body.

**Reviewer Handoff — Test & TSConfig Fixes**

- **Summary:** Updated tests to use `amountCents` and `memo` to match `src/types/index.ts`, and set TypeScript to modern Node resolution (`moduleResolution: node16`, `module: Node16`) with ESM-compatible dynamic imports adjusted in tests.

---

Change: Update agent docs to align with repo conventions (imports, vitest, tests/artifacts)
- One-paragraph summary:
	- Standardized agent guidance to match the repository's current conventions: extensionless TypeScript imports, Vitest/jsdom testing setup, and a requirement that engineers include tests and teaching artifacts for implemented features. These docs changes are documentation-only and do not modify runtime code.
- Line-by-line explanation:
	- `docs/AGENTS.md`: replaced ESM/tooling and verification sections with explicit guidance to use extensionless imports in TS sources, Node16 module resolution, Vitest with `jsdom` and `tests/setupTests.ts`, and a clear verification checklist (`npx tsc --noEmit`, `npm test`, `npx vitest --run`, `cargo test` for Rust changes).
	- `.github/agents/engineer.agent.md`: rule 8 updated to require that engineer agents add tests (Vitest/Rust) and learning artifacts in `docs/learning-artifacts.md`, and to run verification steps locally before requesting review.
	- `.github/agents/planner.agent.md`: added a rule requiring planners to state testing and teaching-artifact requirements in task specs so engineers know what tests/artifacts to produce.
- How to run and test locally (commands):

```powershell
# Static typecheck
npx tsc --noEmit

# Run frontend tests (Vitest)
npm test

# Run Vitest explicitly
npx vitest --run

# If Rust changes are present (not required for this docs-only change):
cd src-tauri
cargo test
```
- Suggested follow-up learning items or references:
	- Read TypeScript `moduleResolution: node16` and Node ESM docs.
	- Review Vitest configuration for `jsdom` and test setup files.
	- Check `docs/AGENTS.md` at the start of each planning/engineering session.
- Implementation TODOs / Reviewer handoff:
	- Confirm these three files only changed: `docs/AGENTS.md`, `.github/agents/engineer.agent.md`, `.github/agents/planner.agent.md`.
	- Run the commands above to verify no type/test regressions.
	- If CI references any scripts by old names (e.g., `.js`), update CI to call `.cjs` variants where appropriate.

---

Change: Safe migration for unique account name index (dedupe before index)
- One-paragraph summary:
	- Implemented a defensive migration step that removes duplicate `accounts.name` rows before creating the unique index `idx_accounts_name`. This prevents runtime failures when an existing DB contains duplicate account names (for example multiple `default` rows) and ensures first-run migrations succeed even if the DB was populated by older app versions or by race conditions on account creation.
- Line-by-line explanation:
	- `db/migrations/0003_unique_account_name.sql`: added a `DELETE FROM accounts WHERE rowid NOT IN (SELECT MIN(rowid) FROM accounts GROUP BY name);` statement before the `CREATE UNIQUE INDEX` so on-disk migrations clean duplicates atomically inside the migration transaction.
	- `src-tauri/src/db.rs` `run_migrations()`: updated the runtime migration batch to include the same deduplication SQL prior to creating the unique index so that in-memory or runtime DBs are protected during startup.
	- `src-tauri/src/db.rs` tests: added `migration_dedupes_existing_duplicates()` which constructs an in-memory DB with two rows having the same `name`, runs `run_migrations()`, and asserts only one row remains and the unique index exists; this provides automated verification for the migration behavior.
- How to run and test locally (commands):

```powershell
# Rust tests (run inside the repo root or src-tauri)
cd src-tauri
cargo test --verbose

# Frontend checks
npx tsc --noEmit
npm test

# Run app (manual verification)
npm run tauri
# Observe logs: migration should not fail with UNIQUE constraint errors
```
- Suggested follow-up learning items or references:
	- Read about SQLite indexes and behavior when creating unique indexes on columns with pre-existing duplicate values.
	- Consider adding migration versioning and a file-runner that applies numbered SQL files in order (if you prefer explicit migration control rather than in-code batches).
- Implementation TODOs / Reviewer handoff:
	- Run `cargo test` to ensure the new migration test passes on CI and local Windows environment.
	- Manually verify starting the app against an existing runtime DB containing duplicate `default` accounts no longer errors; ensure only one `default` remains after migration and `idx_accounts_name` exists.
	- Review whether additional dedupe rules are needed (e.g., prefer rows with non-null `notes` or latest `created_at`) and adjust the SQL accordingly if needed.


Change: Filtering & Querying (Transactions)
- One-paragraph summary:
	- Added server-driven filtering, pagination, and aggregation helpers to the Tauri/Rust backend and a corresponding frontend service wrapper so the UI can request filtered transaction pages and aggregates. The DB layer now uses parameterized queries with safe bound parameters, creates helpful indexes for `date`, `account_id`, and `category_id`, enforces a `limit` cap, and exposes aggregate endpoints for category/date summaries.
- Line-by-line explanation:
	- `src-tauri/src/db.rs`:
		- Added `GetTransactionsFilter` and `PaginatedTransactions` types to represent request filters and paginated responses.
		- Added `get_transactions_paginated(...)` which builds a parameterized WHERE clause from present filters, runs a `COUNT(*)` for total, and returns a page of `TransactionRow` items using `LIMIT ? OFFSET ?`.
		- Added `get_transactions_aggregate_by_category(...)` and `get_transactions_aggregate_by_date(...)` for server-side grouping and aggregation.
		- Created indexes during `run_migrations()` using `CREATE INDEX IF NOT EXISTS ...` for `date`, `account_id`, and `category_id` to improve query performance.
	- `src-tauri/src/commands.rs`:
		- Updated the `get_transactions` Tauri command to accept an optional `GetTransactionsFilter` and return `PaginatedTransactions` so the frontend can request pages and metadata.
		- Adjusted the commands test to call `get_transactions(None)` and assert against `items`.
	- `src/services/tauri-api.ts`:
		- Added typed `TransactionsFilter` and `PaginatedTransactions` types.
		- Added `getTransactionsPaged(filters?)` wrapper that calls the `get_transactions` Tauri command (or returns a local mock when Tauri is unavailable).
		- Kept `getTransactions()` as a compatibility wrapper that returns only `items` (so existing consumers continue to work).
- How to run and test locally (commands):

```powershell
# TypeScript checks (frontend root)
npx tsc --noEmit

# Frontend tests
npm test

# NOTE: Rust tests and full verification should be run by the reviewer (see handoff below).
``` 
- Suggested follow-up learning items or references:
	- SQLite query planning and index usage (`EXPLAIN QUERY PLAN`) to validate the new indexes cover the intended queries.
	- Rust `rusqlite` parameter binding and `ToSql` types for safe query construction.
	- UI patterns for paginated lists and debounce for free-text filters.
- Implementation TODOs / Reviewer handoff:
	- Run `cd src-tauri && cargo test` and ensure all Rust unit tests compile and pass. Pay attention to new DB functions and the updated command signature.
	- Run `npx tsc --noEmit` and `npm test` in the repo root to verify no TypeScript or frontend test regressions.
	- Manually test the Transactions page in a `npm run dev` session wired to Tauri (`npm run tauri`): apply filters, verify pagination, and confirm aggregates return expected totals.
	- Consider adding more exhaustive unit tests for `get_transactions_paginated` covering combinations of filters (date range, q, amount bounds) and pagination edge-cases.
- **Files changed:** `tests/tauri-api.test.ts`, `tsconfig.json`, `docs/learning-artifacts.md` (this file).
- **Why:** Fix TypeScript errors caused by mismatched fixture fields and remove deprecated moduleResolution warnings while keeping ESM-compatible imports.
- **How to verify (commands):**

```powershell
npm ci
npx tsc --noEmit
npm test
```

- **Expected results:**
	- `npx tsc --noEmit` exits with no errors.
	- `npm test` passes (Vitest report shows all tests green).

- **Reviewer checklist:**
	- **Run types:** execute `npx tsc --noEmit` and confirm no errors.
	- **Run tests:** execute `npm test` and confirm all tests pass.
	- **Search fixtures:** inspect repo for any remaining test fixtures using `amount:` or `description:` and update to `amountCents`/`memo` as needed.
	- **PR review:** confirm commit messages and PR title match the suggested naming and include the verification steps.

- **Notes for reviewer:**
	- When reviewing the PR, ensure `tests/tauri-api.test.ts` dynamic imports include the `.js` extension for Node16 resolution; this is an intentional ESM-compatible change.
	- If the project prefers `module: "ESNext"` for other reasons, consider switching to `moduleResolution: "nodeNext"` instead of `node16` and adapt imports accordingly — discuss tradeoffs in PR comments.

- **Follow-up tasks (optional):**
	- Grep the codebase for `description:` and `amount:` outside tests to identify any runtime code that still expects the old keys.
	- Add a small Vitest unit test that asserts the `tauri-api` dev mock and the Tauri invoke wrapper both produce objects matching `src/types/index.ts` to prevent regressions.


---

Change: Fix Vitest test discovery when `vite.config.js` sets `root: 'public'`
- One-paragraph summary:
	- Added an explicit `test` section to `vite.config.js` that tells Vitest where to find test files. When Vite's `root` is changed to `public`, Vitest inherits that root and fails to discover tests located in the repository `tests/` folder. The `test.include` option ensures tests under `tests/` are discovered regardless of Vite's `root` setting.
- Line-by-line explanation:
	- `vite.config.js` `test.include`: the glob `tests/**/*.{test,spec}.{ts,tsx,js,jsx}` explicitly points Vitest to the repository `tests/` directory so test discovery works even when the Vite root is different (e.g., `public`).
	- Placing this config in `vite.config.js` keeps test configuration co-located with build/dev config and avoids needing a separate `vitest` block in `package.json`.
- How to run and test locally (commands):

```powershell
npm install
npm test
# or to run vitest directly with verbose output
npx vitest --run
```

- Expected outcome:
	- `npm test` discovers and runs tests under the `tests/` directory (e.g., `tests/money.test.ts`) and exits with code 0 when tests pass.

- Acceptance criteria / Reviewer next steps:
	- Pull the branch and run the commands above.
	- Confirm Vitest no longer reports `RUN .../public` with `No test files found` and instead runs the `tests/` suite.
	- Verify `npm run dev` behavior is unchanged and the app still serves from `http://localhost:5173` with HMR working.

- Suggested follow-up learning items or references:
	- Vitest config docs: https://vitest.dev/config/
	- Vite config docs: https://vitejs.dev/config/

---

Change: Make Vitest include globs resolve from repository root when Vite `root` is `public`
- One-paragraph summary:
	- Updated `vite.config.js` `test.include` to use a repository-root relative glob (`../tests/...`) so Vitest finds test files under the repo `tests/` folder even when Vite's `root` is set to `public`. This avoids Vitest inheriting the Vite dev `root` and searching `public` for tests.
- Line-by-line explanation:
	- `vite.config.js` `test.include`: changed from `tests/**/*...` to `../tests/**/*...` so the glob resolves one directory up from the `public` root into the repository root `tests/` directory.
- How to run and test locally (commands):

```powershell
git checkout -b feature/fix-vitest-include
# apply the change (or pull the branch with the patch)
npm install
npm test
npm run dev
# when vite reports the Local URL (may be 5173 or another port), check:
curl.exe -I http://localhost:5173/   # or use the port shown by vite
```

- Expected outcome:
	- `npm test`: Vitest finds and runs tests from the repository-root `tests/` directory (no “No test files found” due to `public` root).
	- `npm run dev`: Vite serves the app and `curl` returns `HTTP/1.1 200 OK` on the logged port.

- Suggested commit / PR text to pass to the engineer:
	- Title: fix: make Vitest discover tests when Vite root is public
	- Body: Adjust Vitest include globs to resolve from repo root when Vite `root` is public.
	
	Validation steps:
	- `git checkout -b feature/fix-vitest-include`
	- `npm install`
	- `npm test` (expect tests to run)
	- `npm run dev` and confirm the dev server responds with 200 OK at the logged port

---

8) Change: Enable `rusqlite` `bundled` feature in Cargo.toml
- One-paragraph summary:
	- Updated `src-tauri/Cargo.toml` to set `rusqlite = { version = "^0.29", features = ["bundled"] }`. This instructs `rusqlite` to build and link a bundled SQLite library at compile time, avoiding platform-specific linking problems when a system SQLite dev library is not present.
- Line-by-line explanation:
	- `src-tauri/Cargo.toml`: under `[dependencies]`, replaced the plain `rusqlite = "^0.29"` with a table including `features = ["bundled"]` so Cargo builds the bundled SQLite C sources as part of the crate build.
- How to run and test locally (commands):

```bash
cd src-tauri
cargo clean
cargo test --verbose 2>&1 | Out-File -FilePath '..\\cargo-test.log' -Encoding utf8
```

- Suggested follow-up learning items:
	- Read `rusqlite` docs about the `bundled` feature and trade-offs (build time vs system library reliance).
	- For production, evaluate whether bundling SQLite or relying on a system-provided SQLite is preferable for security/packaging.
- Implementation TODOs for reviewer / next steps:
	- Run the test commands and attach `../cargo-test.log` for verification.

7) Change: Enable Tauri allowlist to match `api-all` feature
- One-paragraph summary:
	- Updated `src-tauri/tauri.conf.json` to include an `allowlist` with `"all": true`. This aligns the runtime config with the Rust crate feature `api-all` (used in `Cargo.toml`) and prevents tauri-build from failing due to mismatched allowlist settings during compile/test.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json`: under the existing `tauri` object, added `"allowlist": { "all": true }`. This setting enables all Tauri APIs from the configuration side so the build-time codegen and runtime features are consistent.
- How to run and test locally (commands):

```bash
cd src-tauri
cargo clean
cargo test --verbose 2>&1 | Out-File -FilePath '..\\cargo-test.log' -Encoding utf8
``` 

- Suggested follow-up learning items:
	- Review Tauri's `tauri.conf.json` allowlist docs and security implications of enabling `all` APIs.
	- Consider restricting the allowlist to only needed APIs before production packaging.
- Implementation TODOs for reviewer / next steps:
	- Run the test commands on a Windows dev machine and attach `../cargo-test.log`.
	- If other build errors surface (MSVC/linker), ensure the Windows native toolchain is installed.

13) Change: Add npm `tauri` script and `@tauri-apps/cli` devDependency
- One-paragraph summary:
	- Added `tauri` and `tauri:build` npm scripts to the repository root `package.json` so reviewers and contributors can run the Tauri dev flow from the repo root using `npm run tauri` and `npm run tauri:build`. Also added `@tauri-apps/cli` as a devDependency to make the Tauri CLI available locally for consistent developer experience.
- Line-by-line explanation:
	- `package.json` `scripts.tauri`: runs `tauri dev` which starts the Tauri dev process (bundles frontend with Vite and runs the Rust backend host).
	- `package.json` `scripts["tauri:build"]`: runs `tauri build` to create a production package.
	- `package.json` `devDependencies.@tauri-apps/cli`: developer tool providing the `tauri` binary; installing as a devDependency avoids requiring a global install.
- How to run and test locally (commands):

```bash
npm ci
npm test -- --run
npm run build
npm run tauri   # starts Tauri dev (frontend+backend)
node scripts/tauri-allowlist-checker.js
```

- Suggested follow-up learning items:
	- If `npm run tauri` still fails, run `npx @tauri-apps/cli dev` to use the local CLI binary.
	- Verify `tauri.conf.json` allowlist is minimal and update `src-tauri/Cargo.toml` features if needed to match the runtime allowlist.

- Implementation TODOs (for engineers / reviewers):
	- Run the commands above and attach dev logs to the PR if errors occur.
	- If CI or contributor machines prefer a global CLI, document it in CONTRIBUTING instead of committing the devDependency.
	- Clean up any Rust warnings (unused imports) surfaced during `cargo test` in `src-tauri/src/db.rs` and `src-tauri/src/main.rs`.

10) Change: Map frontend `tauri` module label to `invoke` in checker report
- One-paragraph summary:
	- Improved the allowlist checker (`scripts/tauri-allowlist-checker.js`) to emit a mapped module list that translates the frontend module label `tauri` (produced when code imports `@tauri-apps/api` without a specific submodule) to the clearer reviewer-facing key `invoke`. This makes `allowlist-report.json` more actionable when selecting minimal `tauri.conf.json` allowlist keys.
- Line-by-line explanation:
	- In `scripts/tauri-allowlist-checker.js` the script already detects `@tauri-apps/api/*` imports and collects the module names in `frontendModules`.
	- The change adds a small `moduleLabelMap = { 'tauri': 'invoke' }` and computes `frontendModulesMapped` by replacing known ambiguous labels with reviewer-friendly keys.
	- The report now includes both `frontendModules` (raw detections) and `frontendModulesMapped` (mapped reviewer keys) so maintainers can see raw context and the suggested allowlist mapping.
- How to run and test locally (commands):

```bash
node scripts/tauri-allowlist-checker.js
jq '.frontendModulesMapped' allowlist-report.json
```

Expect `"invoke"` to appear in `frontendModulesMapped` when the frontend uses `@tauri-apps/api` or `invoke(...)`.
- Suggested follow-up learning items:
	- Extend `moduleLabelMap` with additional mappings as reviewers prefer (e.g., `fs` -> `fs`, `dialog` -> `dialog`).
	- Add small unit tests for the checker script (e.g., sample input files, expected JSON output) to prevent regressions.
- Implementation TODOs (for engineers / PRs):
	- Include the mapping rationale in the PR body and mention any additional allowlist keys added to `src-tauri/tauri.conf.json`.
	- If reviewers prefer different labels, update `moduleLabelMap` accordingly and document the change in this file.

11) Change: Remove `api-all` feature from `tauri` in `src-tauri/Cargo.toml`
- One-paragraph summary:
	- Replaced the `tauri` dependency that enabled the broad `api-all` feature with a minimal dependency declaration (`tauri = { version = "^1.2" }`). This prevents the Tauri build script from failing when `tauri.conf.json` intentionally defines a minimal allowlist and avoids expanding the runtime API surface unintentionally.
- Line-by-line explanation:
	- `src-tauri/Cargo.toml` dependency line: removing `features = ["api-all"]` stops Cargo from enabling all Tauri API features at compile time. The repo's allowlist enforces minimal runtime permissions; keeping feature flags narrow ensures the build script's feature-to-allowlist validation passes.
- How to run and test locally (commands):

```powershell
cd src-tauri
cargo clean
cargo test --verbose
cd ..
node scripts/tauri-allowlist-checker.js
``` 

- Suggested follow-up learning items:
	- Read Tauri feature flags documentation to understand mapping between crate features and runtime allowlist keys.
	- If new frontend APIs are added, update `src-tauri/tauri.conf.json` accordingly and re-run the checker.
- Implementation TODOs for reviewer / next steps:
	- Verify `cargo test` completes on Windows CI and that `allowlist-report.json` shows `allowAll: false`.
	- If additional Tauri APIs are truly required, prefer listing explicit features (e.g., `api-invoke`) and mirror those in `tauri.conf.json` with justification in the PR description.

---

Change: Remove UTF-8 BOM from `src-tauri/tauri.conf.json`
- One-paragraph summary:
	- The Tauri build script failed parsing `src-tauri/tauri.conf.json` due to a leading UTF-8 BOM (bytes EF BB BF). I removed the BOM by re-saving the file as UTF-8 without BOM so `tauri-build` can parse the JSON and `cargo test` can proceed.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json`: the file contained a leading BOM which some JSON parsers (including the build helper) treat as invalid input. Rewriting the file without the BOM preserves the JSON content while ensuring the bytes start with `{`.
- How to validate locally:
	1. Confirm the file no longer contains the BOM (PowerShell):

	```powershell
	Get-Content -Path E:\Documents\Coding_Development\ClinchrFT\src-tauri\tauri.conf.json -Encoding Byte | Select-Object -First 3 | ForEach-Object { "{0:X2}" -f $_ }
	# Expect output starting with 7B (the '{' character), not EF BB BF
	```

	2. Re-run the previous failing command and confirm build script can read the file:

	```powershell
	cd src-tauri
	cargo clean
	cargo test -v
	```

- Suggested follow-ups:
	- Add a pre-commit hook or editor config to ensure JSON files are saved as UTF-8 without BOM (particularly on Windows editors that may default to BOM-enabled saves).
	- If CI re-writes files, ensure an early validation step checks `tauri.conf.json` validity (e.g., `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8'))"`).

---

Follow-up: Automated validation and pre-commit guidance

- One-paragraph summary:
	- Added a repository-level validation script `scripts/validate-tauri-conf.js` and an npm script `validate:tauri-conf` to detect leading UTF-8 BOMs and JSON parse errors early (locally or in CI).

- How to run locally:

```powershell
npm run validate:tauri-conf
```

- Pre-commit / CI suggestions:

	- CI: add `npm run validate:tauri-conf` as an early step in your CI workflow to fail fast on malformed `tauri.conf.json`.
	- Git hooks: add a pre-commit hook that runs `npm run validate:tauri-conf` (via Husky or a simple script). If you prefer not to add Husky, provide a `.githooks/pre-commit` script and set `git config core.hooksPath .githooks` for contributors.
	- Editor guidance: recommend workspace setting for VS Code:

	```
	"files.encoding": "utf8"
	```

	- If any build or CI step rewrites `tauri.conf.json`, ensure it writes UTF-8 without BOM (Node: `fs.writeFileSync(path, content, { encoding: 'utf8' })`).

---

- Reviewer next steps:
	- Re-run the `cargo test` that previously failed and confirm the JSON parse error is resolved.
	- If tests still fail, follow the earlier diagnostic steps in the ticket (check `TAURI_CONFIG` env var, file permissions, and any build-time modifications).

---

Change: Add Tauri allowlist policy text, CI check, and PR checklist item
- One-paragraph summary:
	- Added a short policy paragraph to the engineer agent prompt, ensured the PR template includes a tauri allowlist checkbox, and verified the CI workflow runs the `tauri-allowlist-checker.js`. These small repository hygiene changes help enforce a minimal Tauri allowlist and make allowlist decisions visible in PRs.
- Line-by-line explanation:
	- `.github/agents/engineer.agent.md`: inserted the explicit allowlist policy paragraph so automated engineer agents and contributors follow the minimal-privilege guidance when editing `src-tauri/tauri.conf.json`.
	- `.github/PULL_REQUEST_TEMPLATE.md`: corrected the checklist formatting and ensured a line exists prompting authors to document allowlist changes and justifications.
	- `.github/workflows/ci.yml`: the workflow already runs `node scripts/tauri-allowlist-checker.js`; reviewers should confirm this step appears in CI runs and fails on disallowed config (e.g., `allowlist.all: true`).
- How to run and test locally (commands):

```powershell
# Validate the repository-level allowlist check runs locally
node scripts/tauri-allowlist-checker.js

# Run CI-equivalent local checks (frontend + Rust tests)
npm ci
npx vitest run
cd src-tauri && cargo test --verbose
```
- Suggested follow-up learning items or references:
	- Read Tauri allowlist docs and the mapping between frontend API usage and `tauri.conf.json` keys.
	- Extend `scripts/tauri-allowlist-checker.js` to include small sample-based unit tests.
- Reviewer handoff / next steps:
	- Confirm CI runs and that the allowlist checker step fails when `src-tauri/tauri.conf.json` contains `allowlist.all: true`.
	- When adding native APIs, include `allowlist-report.json` output and a mapping explanation in the PR body.

**Reviewer Handoff**

- **PR / Commit:** include the edits to `src-tauri/src/db.rs` (update_transaction refactor), `src-tauri/src/commands.rs`, `src-tauri/src/main.rs`, and this `docs/learning-artifacts.md` entry. Provide one-paragraph summary + annotated notes in the PR body.
- **CI verification:** run the full CI pipeline (Windows and other runners). Ensure `cargo test` and `npm test` pass and `scripts/tauri-allowlist-checker.js` passes.
- **Runtime check:** exercise `update_transaction` via the app or `invoke` with representative data; run DB-related integration tests.
- **Code audit:** inspect `src-tauri/src/db.rs` for any temporary-borrow patterns; the `update_transaction` function was refactored to use an explicit parameter index and owned `Value` instances.
- **Fix warnings:** removed unused imports in `src-tauri/src/commands.rs` and `src-tauri/src/main.rs`.
- **SQLite config:** confirm `rusqlite` is built with the desired linking strategy on CI (e.g., `bundled` feature) and adjust runners to install the native sqlite dev libs if not using `bundled`.
- **Optional improvement:** add an integration test to cover `update_transaction` through the Tauri command layer to prevent regressions.
- **Commands to run locally / in CI:**

```powershell
cd src-tauri
cargo clean
cargo test -v
```

and for frontend/tests:

```bash
npm ci
npm test
```

---

Follow the project's normal PR flow: open `feature/transactions-crud` branch, push changes, and request `@reviewer` to run CI and verify runtime behavior.

	---

	12) Change: Convert `tests/checker.test.js` to use ESM `import`
	- One-paragraph summary:
		- Replaced CommonJS `require()` usage in `tests/checker.test.js` with ESM `import` statements so Vitest can be imported and executed as an ES module. This avoids the runtime error `Vitest cannot be imported in a CommonJS module using require()` and allows the test runner to execute the checker test alongside existing TypeScript/ESM tests.

	- Line-by-line explanation:
		- `import fs from 'fs'`, `import path from 'path'`, `import os from 'os'`, `import cp from 'child_process'`: standard Node ESM imports for filesystem and child process helpers.
		- `import { test, expect } from 'vitest'`: imports Vitest's test APIs as ESM so Vitest is not required inside a CommonJS module.
		- Test body: creates a temporary repository layout under the OS temp directory, writes a minimal React `App.tsx` that calls `invoke(...)`, writes a sample `commands.rs` containing `#[tauri::command]` functions, writes a minimal `tauri.conf.json`, runs the repository checker script with `CLINCHRFT_REPO_ROOT` set to the temp folder, and asserts the produced `allowlist-report.json` contains the expected mapping and command names.

	- How to run and test locally (commands):

	```bash
	cd /d E:\Documents\Coding_Development\ClinchrFT
	npm install
	npm test
	```

	If your environment still treats `.js` files as CommonJS, run the single test directly with Vitest explicitly as a module, or rename to `.test.mjs`. Example to run only the checker test:

	```bash
	npx vitest run tests/checker.test.js
	```

	- Suggested follow-up learning items or references:
		- Read Vitest docs about ESM vs CommonJS module resolution and how test files are treated.
		- Consider adding a linter rule or a pre-commit hook to enforce ESM-style test files to avoid similar breakage.

	- Implementation TODOs / notes for reviewer / next steps:
		- Reviewer: run `npm test` in CI to confirm both `tests/money.test.ts` and `tests/checker.test.js` pass in your environment.
		- If CI agents treat `.js` as CommonJS, consider adding `"type": "module"` to `package.json` or renaming test to `checker.test.mjs`.
		- Confirm no other test files rely on CommonJS `require()`; update them to ESM if needed.

	15) Change: Fix TypeScript test-suite failure and add stable test globals
	- One-paragraph summary:
		- Resolved a TS type-check failure (`TS2349`) in tests and intermittent Vitest runtime errors by exposing Vitest ambient types to the TypeScript compiler and providing a stable `localStorage` shim for the test environment. This prevents `npx tsc --noEmit` from failing due to missing test globals and avoids test flakiness caused by missing or polluted `localStorage` across test files.
	- Line-by-line explanation:
		- `tsconfig.json`: added `"types": ["node", "vitest"]` so the compiler includes Vitest's ambient declarations; added `"allowJs": true` to allow test imports that include `.js` extension to resolve in the TypeScript build step.
		- `vite.config.js`: added `test.setupFiles: ['tests/setupTests.ts']` so the localStorage shim runs before tests.
		- `tests/setupTests.ts`: new file providing a minimal `localStorage` implementation and a `beforeEach` hook that clears storage before every test.
	- How to run and test locally (commands):

	```powershell
	npx tsc --noEmit
	npm test
	```
	- Suggested follow-up learning items or references:
		- Vitest setup files: https://vitest.dev/config/#setupfiles
		- TypeScript `types` compiler option: https://www.typescriptlang.org/tsconfig#types
	- Reviewer handoff:
		- Verify `npx tsc --noEmit` succeeds locally.
		- Run `npm test` and confirm all tests pass.
		- If tests still show mixed `.js`/`.ts` resolution problems, consider normalizing imports in tests to omit extensions and remove `allowJs`.

14) Change: Align Vite and `@vitejs/plugin-react` versions to resolve install failure

---

Change: Upgrade Tauri Rust crates to v2 to match CLI/NPM v2

- One-paragraph summary:
	- Updated `src-tauri/Cargo.toml` to use Tauri crates v2 (`tauri = "2"` and `tauri-build = "2"`) so the Rust side aligns with the installed `@tauri-apps/cli` / `@tauri-apps/api` v2 schema. This resolves the build-time schema validation error where `tauri-build` v1 rejected v2-shaped `tauri.conf.json` (unknown top-level `app` field).
- Line-by-line explanation:
	- `src-tauri/Cargo.toml` dependency lines: changed `tauri` from `^1.2` to `2` and `tauri-build` from `^1.2` to `2`. This instructs Cargo to fetch the Tauri v2 crates which understand the v2 `tauri.conf.json` shape.
	- No source code edits were made in this commit; Rust API surface changes may still be required depending on usage of Tauri APIs in `src-tauri/src/*.rs`.
- How to run and test locally (commands):

```powershell
cd src-tauri
cargo update
cd ..
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
npm run tauri
```

- Suggested follow-up learning items or references:
	- Read Tauri v2 migration notes and changelog for Rust API changes: https://tauri.app/v2/guides/migration
	- Review `src-tauri/src/*.rs` for any deprecated v1 APIs (e.g., `tauri::Builder` or feature flags) and adjust per v2 docs.
- Implementation TODOs / reviewer handoff (next steps for `@reviewer`):
	1. Run the commands above on a Windows machine with Rust/MSVC installed.
	2. If `cargo` compile errors occur, inspect `src-tauri/src/*.rs` and adapt code to Tauri v2 API (likely small changes around builder/context usage or feature flags).
	3. Re-run `npm run tauri` and attach the new `tauri-info.log` and `allowlist-report.json` if successful.
	4. If Rust API changes are non-trivial, open a follow-up `feature/tauri-v2` branch and document the necessary code edits in the PR body with annotated explanations.

---

**Reviewer Handoff**

- Implemented change: `src-tauri/Cargo.toml` updated to Tauri v2 crates.
- Assumptions: The frontend CLI & `@tauri-apps/api` are already v2; no Rust source edits were applied in this patch.
- Areas to verify during review:
  - Compile the Rust project and fix any v2 API breakages in `src-tauri/src/`.
  - Ensure `tauri.conf.json` remains valid for v2 and the allowlist checker passes.
  - Run full acceptance checks: `npm run dev` (frontend) and `npm run tauri` (full desktop dev).

- Commands for reviewer to run:

```powershell
cd src-tauri
cargo update
cargo clean
cargo build --verbose
cd ..
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
npm run tauri
```

If you'd like, I can continue by running the minimal code changes required in `src-tauri/src/*.rs` to compile under Tauri v2 — tell me and I'll proceed with a focused patch and include the required teaching artifacts.
- One-paragraph summary:
	- Updated `package.json` devDependency `@vitejs/plugin-react` from `^4.0.0` to `^5.0.0` so the plugin's peer dependency range includes `vite@8.x`. This resolves an `ERESOLVE` peer dependency error that blocked `npm ci` and prevented running frontend tests and Tauri dev.
- Line-by-line explanation:
	- `package.json` `devDependencies.@vitejs/plugin-react`: bumped to `^5.0.0` which declares compatibility with Vite 8; no other dependency changes were made.
	- No changes were required in Vite config or source files because the plugin API between v4 and v5 is backward-compatible for this project.
- How to run and test locally (commands):

```bash
cd /d E:\Documents\Coding_Development\ClinchrFT
npm ci
npm test -- --run
npm run build
npm run tauri    # or: npx @tauri-apps/cli dev
node scripts/tauri-allowlist-checker.js
cd src-tauri && cargo test
```
- Suggested follow-up learning items:
	- Review npm peer dependency resolution behavior and the meaning of `ERESOLVE` vs `--legacy-peer-deps`.
	- Read the `@vitejs/plugin-react` release notes for v5 to see any migration notes if the project adopts advanced Vite plugin features.
- Implementation TODOs (for reviewers / next steps):
	- Run the commands above and confirm `npm ci` succeeds without `--legacy-peer-deps`.
	- If CI pins older Vite versions, ensure the CI Node cache is cleared or update any lockfiles accordingly.

---

Change: Backup and replace `src-tauri/tauri.conf.json` with a minimal Tauri v2 config

- One-paragraph summary:
	- Backed up the existing `src-tauri/tauri.conf.json` to `src-tauri/tauri.conf.json.bak` and replaced it with a minimal Tauri v2 configuration that sets a development `devPath`, `distDir`, disables global allowlist (`all: false`), and adds a minimal `bundle.active` flag. Captured `npm run tauri` and `npx tauri info --verbose` outputs to `tauri-dev.log` and `tauri-info.log` for debugging.

- Line-by-line explanation / mapping:
	- `build.devPath`: points to the Vite dev server used during development (`http://localhost:5173`).
	- `build.distDir`: the production dist output relative to `src-tauri`.
	- `tauri.bundle.active`: marks bundling as active for developer clarity.
	- `tauri.allowlist.all: false`: ensures the runtime allowlist is minimal; add only required keys.
	- `tauri.security.csp: null`: left explicit as null per the minimal template provided by reviewers.

- How to run and validate locally (commands):

```powershell
cd 'e:\\Documents\\Coding_Development\\ClinchrFT'
# run Tauri dev and capture logs
npm run tauri > tauri-dev.log 2>&1
# capture Tauri environment info
npx tauri info --verbose > tauri-info.log 2>&1
```

- What was changed (files):
	- `src-tauri/tauri.conf.json` — replaced with minimal config
	- `src-tauri/tauri.conf.json.bak` — backup of the previous config (overwritten/updated)
	- `tauri-dev.log`, `tauri-info.log` — generated logs in the repo root

- Reviewer next steps / handoff to `@reviewer`:
	1. Inspect `src-tauri/tauri.conf.json` and confirm the minimal allowlist meets expected front-end API needs.
	2. Open and attach `tauri-dev.log` and `tauri-info.log` to the PR if `npm run tauri` still errors.
	3. If additional allowlist keys are required, run `node scripts/tauri-allowlist-checker.js` and update `src-tauri/tauri.conf.json` accordingly, documenting the mapping in the PR body.

	- If any runtime plugin incompatibilities surface, revert to a compatible Vite version or adapt the code per plugin migration notes.

---

Change: Transactions CRUD implementation (summary)
- One-paragraph summary:
	- Implemented backend DB helpers and Tauri commands for transactions CRUD, wired frontend services and simple UI components (`TransactionList`, `TransactionForm`) to call the new commands. This enables create/read/update/delete flows persisted to a local SQLite DB under the application data folder.

- Line-by-line explanation / annotated notes:
	- `src-tauri/src/db.rs`: added `open_db`, `run_migrations`, `get_transactions`, `insert_transaction`, `update_transaction`, `delete_transaction`. Introduced `TransactionRow`, `CreateTransaction`, and `UpdateTransaction` types with `serde(rename_all = "camelCase")` so JSON keys match the renderer. Unit tests added that exercise a full CRUD roundtrip in an in-memory DB.
	- `src-tauri/src/commands.rs`: added Tauri commands `create_transaction`, `update_transaction`, `delete_transaction`, and updated `get_transactions` to call DB helpers. Commands return user-friendly error messages and avoid leaking internal paths.
	- `src-tauri/src/main.rs`: registered the new commands in `invoke_handler` so the frontend can call them.
	- `src/services/tauri-api.ts`: added `createTransaction`, `updateTransaction`, and `deleteTransaction` wrappers around `invoke`.
	- `src/pages/Transactions.tsx`: replaced mock data with real fetch from `getTransactions`, added create/edit modal flow that uses `TransactionForm` and `TransactionList` components.
	- `src/components/TransactionList.tsx`: new presentational table with Edit/Delete actions.
	- `src/components/TransactionForm.tsx`: new form for create/edit flows; uses `dollarsToCents`/`centsToDollars` from `src/lib/money.ts`.
	- `src/types/index.ts`: aligned `categoryId` to be optional to match backend representation.

- How to run and test locally (commands)

```bash
npm install
npm run dev      # frontend only
# in a separate terminal (requires Rust + Tauri toolchain):
cd src-tauri
cargo test       # runs Rust unit tests
cargo tauri dev  # runs Tauri dev with backend + frontend
```

- Suggested follow-ups / learning items:
	- Add accounts/categories CRUD and present display names in the transactions list.
	- Add validation and nicer UX for the TransactionForm (selects for accounts/categories).
	- Implement a migration runner that reads `db/migrations/*.sql` files instead of embedding DDL.

- Implementation TODOs for reviewer / next steps:
	- Run `cargo test` and `npm run dev` and verify create/edit/delete flows persist to `%APPDATA%/ClinchrFT/clinchrft.db`.

---

Change: Add DB-path override and command-layer roundtrip test
- One-paragraph summary:
	- Added an environment-variable override for the application DB path (`CLINCHRFT_DB_PATH`) in `src-tauri/src/commands.rs` and a unit test that exercises the Tauri command wrappers (`create_transaction`, `update_transaction`, `delete_transaction`, `get_transactions`) end-to-end against a temporary DB file. This provides a lightweight integration check that the command layer wiring and DB helpers cooperate and makes CI/local tests avoid touching a user's real AppData path.

- Line-by-line explanation:
	- `src-tauri/src/commands.rs::db_path()`:
		- Checks `CLINCHRFT_DB_PATH` env var and uses it if set; otherwise falls back to the existing `%APPDATA%` location. This allows tests to redirect DB location to a temp file.
		- Keeps the existing behavior for normal runs so the app still stores `clinchrft.db` under the application data folder.
	- `#[cfg(test)] mod tests` (in `commands.rs`):
		- Uses `tempfile::NamedTempFile` to create a temp path, sets the env var to that path, then calls the command wrappers directly:
			- `create_transaction(...)` to insert a row.
			- `update_transaction(...)` to modify the inserted row and assert the changed value.
			- `delete_transaction(...)` and `get_transactions()` to assert the row was removed.

- How to run and test locally (commands):

```powershell
cd src-tauri
cargo clean
cargo test -v
```


- Suggested follow-up learning items or references:
	- Add a dedicated integration test that spins up a minimal Tauri `Builder` and invokes commands via the real IPC layer for higher-fidelity coverage.
	- Consider using a test-only feature flag that isolates Tauri-specific tests from unit tests when CI runners lack native GUI dependencies.

- Implementation TODOs / next steps for reviewer:
	- Run `cargo test` on Windows and one non-Windows runner in CI to confirm rusqlite linking works (the repo uses the `bundled` feature to avoid system sqlite dependency).
	- If you want IPC-level integration tests, request that the `@planner` create a task specifying test harness requirements (App builder, headless mode, and any allowlist adjustments).

Reviewer handoff:
- What I implemented: `CLINCHRFT_DB_PATH` override and a roundtrip test in `src-tauri/src/commands.rs`.
- Assumptions: tests may set `CLINCHRFT_DB_PATH` to avoid writing to `%APPDATA%`; the existing `rusqlite` bundled feature is used for predictable CI linking.
- Areas for attention in review: ensure CI runners permit building `rusqlite` with the `bundled` feature and that any new test artifacts are acceptable in your CI policy.

Next steps for you / `@reviewer`:
- Run `cd src-tauri && cargo test -v` on your CI runners (Windows + non-Windows) and attach logs if failures occur.
- Optionally ask `@planner` to define an IPC-level integration test task if you want the test to exercise `invoke` through Tauri's runtime instead of calling the command functions directly.

	- Review Tauri allowlist and ensure `tauri.conf.json` contains only the necessary keys for `invoke` usage.
	- Confirm that JSON field naming stays consistent across frontend and backend; tests cover this for basic cases.

---

Change: Fix borrow-of-temporary in `src-tauri/src/db.rs` (E0716)
- One-paragraph summary:
	- Resolved a compile-time borrow error where the code pushed a reference to a temporary `rusqlite::types::Value` (created inline) into a vector of references. The fix pushes owned `Value` instances into the parameter vector and consumes it when executing the prepared statement, avoiding dangling references and ensuring `cargo test` can compile.
- Line-by-line explanation:
	- In `update_transaction`, the original code collected `params_vec.iter()` into a `Vec<&Value>` and then attempted to push `&Value::from(id.to_string())` (a temporary). That temporary was dropped at statement end, leaving a dangling reference.
	- The change replaces the reference-based approach with owned values: `params_vec.push(Value::from(id.to_string()))` and then passes the iterator `params_vec.into_iter()` to `rusqlite::params_from_iter`, which consumes the owned values.
	- This approach is simpler and safer: it avoids lifetime gymnastics and leverages `rusqlite`'s ability to accept owned `Value` items as parameters.
- How to run and test locally (commands):

```powershell
cd src-tauri
cargo clean
cargo test -v
``` 

- Suggested follow-up learning items or references:
	- Read Rust ownership/lifetimes primer, focusing on why referencing temporaries causes E0716.
	- Review `rusqlite::params_from_iter` and `rusqlite::types::Value` implementations of `ToSql`.
	- Consider adding unit tests around SQL parameter construction paths to catch similar regressions.
- Implementation TODOs for reviewer / next steps:
	- Run the `cargo test` command above on Windows/CI to confirm the compilation error is resolved.
	- Inspect `src-tauri/src/db.rs` for any other instances of pushing references to temporaries and fix similarly.
	- If desired, suggest a refactor to centralize parameter building into a helper function to reduce duplication and enhance testability.

---
Change: Fix Vite dev root and enable React plugin
- One-paragraph summary:
	- Updated `vite.config.js` to set `root: 'public'` (serve `public/index.html` in dev) and enabled `@vitejs/plugin-react` so `.tsx` files are transformed and HMR works. This prevents the Pre-transform error and 404 for `main.tsx` in the Tauri dev window.
- Line-by-line explanation:
	- `vite.config.js`: import `react` from `@vitejs/plugin-react`, add `plugins: [react()]`, preserve `root: 'public'`, and keep the `server.watch.ignored` glob for `src-tauri/target`.
	- `package.json`: ensure `@vitejs/plugin-react` is present in `devDependencies`. If missing, run `npm install -D @vitejs/plugin-react`.
- How to run and test locally (commands):
```powershell
cd "e:\\Documents\\Coding_Development\\ClinchrFT"
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
npm install    # ensure deps installed; if plugin missing: npm install -D @vitejs/plugin-react
npx tauri dev
# or frontend-only:
npm run dev
curl -I http://localhost:5173/
```
- Expected outcome:
	- Vite serves `index.html` from `public/` and transforms `main.tsx` without Pre-transform errors.
	- `curl -I http://localhost:5173/` returns `HTTP/1.1 200 OK`.
	- Tauri window loads the React app (no 404) and logs show no pre-transform error.
- Suggested follow-up learning items or references:
	- Vite docs: dev `root` and plugin system, `@vitejs/plugin-react` HMR behavior.
- Implementation TODOs / reviewer handoff:
	1. Create branch `feature/fix-vite-dev-root-react-plugin`.
	2. Commit updated `vite.config.js` and `package.json` changes.
	3. Run `npm install` (or `npm install -D @vitejs/plugin-react` if needed) and run the validation scripts above.
	4. Attach `tauri-dev.log` showing successful 200/app load to the PR.
	5. Ask `@reviewer` to run the acceptance checklist and CI checks.

	---

	Change: Serve repository root for Vite dev (move `index.html` to repo root)
	- One-paragraph summary:
		- Reverted the Vite dev `root` change that served `public` as the project root. Instead, `index.html` is now at the repository root and Vite serves the repo root (the default). This makes module imports canonical (`/src/main.tsx`), avoids `/@fs`-style imports, and prevents fragile filesystem workarounds on Windows.
	- Line-by-line explanation:
		- `vite.config.js`: removed `root: 'public'` so Vite uses the repo root. Kept `server.watch.ignored` for `**/src-tauri/target/**` and the `test.include` glob to ensure Vitest discovers tests.
		- `index.html` moved from `public/index.html` to `index.html` at repo root. The `<script>` now loads `/src/main.tsx` (module path resolved by Vite) instead of a `../src/main.tsx` or `/@fs/...` hack.
		- `public/` remains as the static `publicDir` for icons and other static assets; Vite will still serve files from `public/` at the root path.
	- How to run and test locally (commands):

	```powershell
	# create branch and move file (example steps used when applying patch locally)
	git checkout -b feature/fix-vite-root
	git mv public/index.html index.html
	# install deps and start dev server
	npm ci
	npm run dev
	# in another shell, confirm module serving
	curl.exe -i http://localhost:5173/src/main.tsx
	```

	- Expected outcome / acceptance criteria:
		- `curl -i http://localhost:5173/src/main.tsx` returns the module source (`Content-Type: application/javascript`) not `index.html`.
		- Browser DevTools shows no MIME or module-load errors for `main.tsx`.
		- `npm test` still discovers tests and passes.
		- `npm run dev` serves static assets from `public/` as before.

	- Suggested follow-up learning items or references:
		- Read Vite docs on `root` and `publicDir`: https://vitejs.dev/config/
		- Understand Vite's `/@fs` pseudo-prefix and why avoiding it reduces platform-specific issues.

	- Implementation TODOs / reviewer handoff:
		1. Verify `index.html` at repo root references `/src/main.tsx`.
		2. Run the commands above and confirm the acceptance criteria.
		3. If CI or packaging scripts assumed `public/index.html`, update them to point at the repo-root `index.html` or adjust build steps accordingly.

	---

	Change: Fix Vitest test discovery after reverting Vite root to repository root
	- One-paragraph summary:
		- Updated `vite.config.js` `test.include` to use a repo-root relative glob so Vitest discovers tests under the repository `tests/` directory when Vite's dev root is the repository root. This prevents `No test files found` errors that occur when the glob points outside the repository.
	- Line-by-line explanation:
		- `vite.config.js` `test.include`: now `tests/**/*.{test,spec}.{ts,tsx,js,jsx}`, which is resolved from the project root where Vitest runs.
	- How to run and test locally (commands):

	```powershell
	npm ci
	npm test
	```

	- Expected outcome:
		- Vitest discovers and runs tests in `tests/` and exits with code 0 when tests pass.
	- Reviewer next steps / handoff:
		- Pull the branch with the `vite.config.js` change, run `npm test`, and confirm tests are discovered and executed. If discovery still fails, check for alternative Vitest config in `package.json` or environment overrides.

---

Change: Tauri detection fix in `src/services/tauri-api.ts`
- One-paragraph summary:
		- Strengthened the runtime detection for the Tauri bridge in `src/services/tauri-api.ts` so tests and browser dev runs do not throw when `window` is undefined (e.g., Node test environments). The change checks `window` when present, otherwise falls back to `globalThis`, and safely reads `__TAURI_INTERNALS__`.
- Line-by-line explanation:
		- `isTauriAvailable()`: now does `const g: any = (typeof window !== 'undefined') ? window : globalThis` so the code does not reference `window` in Node-like runtimes where it is undefined. Then it checks `typeof g.__TAURI_INTERNALS__ !== 'undefined'` to detect Tauri.
		- This avoids importing `@tauri-apps/api/core` in non-Tauri environments and makes unit tests that mock Tauri behavior more reliable.
- How to run and test locally (commands):

```powershell
# Create feature branch
git checkout -b feature/tauri-detection-fix

# Run unit tests (Vitest)
npm test

# Sanity-check dev server
npm run dev
# open http://localhost:5173 and visit the Transactions page
```

- Suggested follow-up learning items or references:
		- Read about `globalThis` vs `window` in cross-platform JS environments.
		- Review Vitest/Node environment differences and how to mock browser globals in tests.

- Implementation TODOs / Reviewer handoff:
		- Verify `npm test` passes including `tests/tauri-api.test.ts` and the test "forwards to Tauri invoke when available" succeeds.
		- Confirm `npm run dev` shows no uncaught Tauri-related console errors and the Transactions UI functions using the localStorage mock when Tauri is absent.

Engineer instructions (apply + verify) — copy into the new engineer session:
1. Create a branch:

```bash
git checkout -b feature/tauri-detection-fix
```
2. Edit `src/services/tauri-api.ts` and replace the `isTauriAvailable()` implementation with:

```ts
function isTauriAvailable(): boolean {
	try {
		const g: any = (typeof window !== 'undefined') ? window : globalThis
		return typeof g.__TAURI_INTERNALS__ !== 'undefined'
	} catch (e) {
		return false
	}
}
```
3. Run unit tests:

```bash
npm test
```
Expect: all tests pass (including `tauri-api.test.ts`).
4. Sanity-check dev server:

```bash
npm run dev
# open http://localhost:5173 and verify Transactions UI works without Tauri errors
```
5. Commit and open PR:

```bash
git add src/services/tauri-api.ts
git commit -m "feat(tauri-api): detect Tauri on window or globalThis (fix test env)"
git push --set-upstream origin feature/tauri-detection-fix
```

Acceptance criteria:
- `npm test` passes.
- The failing test "forwards to Tauri invoke when available" succeeds (mock called).
- Browser dev server still works with localStorage mock when Tauri is absent.

Reviewer handoff:
- Ask `@engineer` to apply the small change above in a fresh session and run the commands in steps 3–5. Attach test output if any failures occur.

---

Change: Export `isTauriAvailable()` and add focused detection tests
- One-paragraph summary:
	- Exported the runtime-detection helper `isTauriAvailable()` from `src/services/tauri-api.ts` and added focused unit tests in `tests/tauri-api.test.ts` to validate Tauri detection when `globalThis.__TAURI_INTERNALS__` or `window.__TAURI_INTERNALS__` is present. This makes the detection logic directly testable and prevents environment-specific import failures.
- Line-by-line explanation:
	- `isTauriAvailable()` (`src/services/tauri-api.ts`): returns true when either `globalThis.__TAURI_INTERNALS__` or `window.__TAURI_INTERNALS__` is defined; wrapped in try/catch for safety in constrained runtimes.
	- Tests (`tests/tauri-api.test.ts`): added four tests — two that assert `getTransactions()` forwards to the mocked `invoke` when detection points are present, and two that import the module and call `isTauriAvailable()` directly to assert it returns `true` in those scenarios. Adjusted mock reset to use `mockInvoke.mockReset()` so the `vi.mock` factory keeps a stable function reference across dynamic imports.
- How to run and test locally (commands):

```powershell
npm ci
npm test
```

- Suggested follow-up learning items or references:
	- Vitest mocking and `vi.mock` behavior with dynamic `import()`.
	- Cross-environment globals: `globalThis` vs `window` and implications for Node test environments.

- Reviewer checklist / handoff to `@reviewer`:
	- Pull the branch and run `npm ci` and `npm test` — expect all tests to pass.
	- Confirm the new tests exist in [tests/tauri-api.test.ts](tests/tauri-api.test.ts#L1-L200) and behave as described.
	- Inspect [src/services/tauri-api.ts](src/services/tauri-api.ts#L1) to verify `isTauriAvailable()` is exported and its implementation is resilient to missing `window`.
	- Verify the test mock setup uses `mockInvoke.mockReset()` (not reassigning the mock) in `beforeEach` so the mocked `invoke` remains the same function reference.
	- Optional: add a negative test asserting `isTauriAvailable()` returns `false` when neither marker is present.

	---

	Change: Repo-local DB option for development (`CLINCHRFT_USE_REPO_DB`)
	- One-paragraph summary:
		- Added an explicit, opt-in developer flag `CLINCHRFT_USE_REPO_DB` so contributors can run the app against a repo-local SQLite DB at `./data/clinchrft.db`. This preserves existing `CLINCHRFT_DB_PATH` behavior (highest priority) and the production default (OS app-data folder). A `.gitignore` entry for `data/clinchrft.db` was added to avoid accidental commits.
	- Line-by-line explanation:
		- `src-tauri/src/commands.rs`:
			- `db_path()` now checks (in order): `CLINCHRFT_DB_PATH` (if set, used unchanged), `CLINCHRFT_USE_REPO_DB` (if set, resolves `cwd/data/clinchrft.db`, creating `./data` if needed), and finally the `directories::ProjectDirs` app-data folder (production default). This keeps behavior deterministic and opt-in for devs.
		- `.gitignore`: added `data/clinchrft.db` to prevent committing local DBs.
		- `README.md`: added short instructions and PowerShell examples showing how to enable repo-local DB mode or set `CLINCHRFT_DB_PATH` explicitly.
	- How to run and test locally (commands):
		- PowerShell (repo root):

	```powershell
	Set-Location 'E:\path\to\repo'
	$env:CLINCHRFT_USE_REPO_DB = '1'
	npm run tauri
	```

		- Or explicitly set `CLINCHRFT_DB_PATH`:

	```powershell
	$env:CLINCHRFT_DB_PATH = (Resolve-Path .\data\clinchrft.db).Path
	npm run tauri
	```

		- Note: `run_migrations()` runs on startup and enforces the intended schema. When switching DB paths, copy the existing DB file to the new location or execute the SQL migration files in `db/migrations/` against the target DB.
	- Suggested follow-up learning items:
		- Review `directories::ProjectDirs` to understand platform app-data locations.
		- Inspect `db/migrations/0002_accounts_categories.sql` to understand schema migration implications when moving DB files.
	- Implementation TODOs / Reviewer handoff:
		- Verify default behavior remains unchanged for end users (run app without env vars and confirm DB under OS app-data).
		- Verify `CLINCHRFT_USE_REPO_DB` creates `./data/clinchrft.db` and that file is ignored by git.
		- Run `cargo test` in `src-tauri` to ensure no test regressions (tests that set `CLINCHRFT_DB_PATH` should pass).
		- Reviewer: run the following commands to validate both default and repo-local behavior:

	```powershell
	# Default behavior (no env vars)
	npm run tauri

	# Repo-local DB behavior
	Set-Location 'E:\path\to\repo'
	$env:CLINCHRFT_USE_REPO_DB = '1'
	npm run tauri

	# Rust tests
	cd src-tauri
	cargo test
	```

	- Notes for reviewer: confirm that no other code assumes the DB path is in app-data (grep for `ProjectDirs::from`) and validate migration behavior when switching DB files.

	---

	**Reviewer handoff**

	- Implemented: opt-in repo-local DB resolution via `CLINCHRFT_USE_REPO_DB`, preserved `CLINCHRFT_DB_PATH`, added `.gitignore` entry, and documented steps in `README.md` and this learning artifact.
	- Assumptions: creating `./data` in the current working directory is acceptable for dev workflows.
	- Please run the validation commands above in a fresh `@reviewer` session and report any failures or unexpected behavior.

---

	Change: Replace free-text Category with select, hide confusing “Unassigned” option, and polish account UX
	- One-paragraph summary:
		- Replaced the free-text Category input with a dropdown and removed the confusing selectable `Unassigned` account option. The `TransactionForm` now accepts an optional `categories` prop from the parent page (preferred) and falls back to `getCategories()` when not provided. Before invoking the backend, the frontend normalizes empty-string `categoryId` to `undefined` so the backend receives a clear null/missing value and foreign-key insertion errors are avoided.
	- Line-by-line explanation:
		- `src/components/TransactionForm.tsx`:
			- Added an optional `categories?: Category[]` prop and prefer `props.categories` when present.
			- The Category input is a `<select>` rendered as:
				- `<option value="">No category</option>`
				- `categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)`
			- On submit the form maps `categoryId === ''` to `undefined` so the save payload does not contain an empty-string id.
		- `src/pages/Transactions.tsx`:
			- Track `categoriesList` in state and pass `categories={categoriesList}` into `TransactionForm` to avoid redundant fetching and ensure the list is consistent across the page.
			- Account selector placeholder changed from a selectable `Unassigned` option to a disabled placeholder `<option value="" disabled>Choose account</option>` to avoid presenting an ambiguous empty-account choice.
		- `src/services/tauri-api.ts`:
			- `createTransaction` and `updateTransaction` sanitize incoming payloads by converting `categoryId === ''` into `undefined` before calling `invoke(...)` or persisting into the localStorage mock.
		- `tests/transaction-form.test.tsx`:
			- Added component tests asserting that when "No category" is selected the `onSave` payload contains `categoryId: undefined`, and when a real category is selected the payload includes the selected id.
	- How to run and test locally (commands):

	```powershell
	# Install deps if needed
	npm install

	# Run unit tests
	npm test

	# Frontend dev
	npm run dev

	# Full Tauri dev (requires Rust toolchain)
	npm run tauri
	```
	- Suggested follow-up learning items or references:
		- Consider extracting a `useReferences()` hook to centralize fetching/caching of `accounts` and `categories` for reuse across pages/components.
		- If UX needs explicit support for an unassigned account, implement a visible `No account` option that maps to `null` rather than relying on an empty-string sentinel.
	- Implementation TODOs / Reviewer handoff:
		- Run `npx tsc --noEmit` and `npm test` to verify typechecks and tests pass.
		- Manually verify the Transactions page behavior:
			- Category appears as a select populated with categories.
			- Account dropdown shows a disabled placeholder rather than a selectable empty value.
			- Creating a transaction with "No category" results in a saved transaction with `category_id` as `NULL`/missing (no FK error).
		- Check for any code paths that treated `''` as a sentinel value and update to treat `undefined`/`null` as canonical missing values.



