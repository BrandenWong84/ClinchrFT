One-paragraph summary:
- Added a frontend guard to `src/pages/Transactions.tsx` to avoid concurrent creation of the default account on first-run, and made the backend insert for accounts idempotent by adding a unique index on `accounts(name)` and using `INSERT OR IGNORE` with a follow-up `SELECT` by name. Also added an explicit migration `db/migrations/0003_unique_account_name.sql` and a Rust unit test to assert duplicate insertions are prevented.

Line-by-line explanation:
- `src/pages/Transactions.tsx`: introduced `createdDefaultRef` with `useRef(false)` and, when accounts are empty, re-checked `getAccounts()` before creating; only calls `createAccount('default')` if the re-check still reports zero accounts. This prevents race conditions during React StrictMode double-mounts or concurrent loads.
- `src-tauri/src/db.rs`: updated `run_migrations()` to create a unique index: `idx_accounts_name` on `accounts(name)`; changed `insert_account()` to use `INSERT OR IGNORE` and then `SELECT` by `name` so the function is idempotent and returns the existing row when a concurrent insert occurred.
- `db/migrations/0003_unique_account_name.sql`: new migration file that creates the unique index for on-disk DBs.
- `src-tauri/src/db.rs` tests: added `duplicate_account_prevented` unit test demonstrating that trying to insert the same account name twice returns the same account name and that only one DB row exists.

How to run and test locally (commands):

```powershell
# Rust tests
cd src-tauri
cargo test

# TypeScript checks and frontend tests (repo root)
npx tsc --noEmit
npm test

# Run the app and manually verify behavior
npm run tauri
# On first run (or after removing the DB file), Transactions page should create a single "default" account and the account dropdown should show only one "default" entry.
```

Suggested follow-up learning items or references:
- Read about SQLite `INSERT OR IGNORE` semantics and how unique indexes interact with concurrent writes.
- Review React StrictMode double-mount behavior in development and how `useRef` can be used as a simple once-only guard.

Reviewer handoff:
- Run `cargo test` and frontend tests locally and attach outputs to the PR.
- Reproduce the original bug by deleting `data/clinchrft.db` and running `npm run tauri` to confirm only one `default` account is created.
- Inspect the DB file and confirm `idx_accounts_name` exists and that there is only one `accounts` row with `name = 'default'`.
