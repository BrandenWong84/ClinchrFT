# Run Locally — Checklist

Purpose: confirm how to run the app locally (frontend-only vs full Tauri) and which code areas require Tauri command invocation.

## Quick answer
- Frontend entry point: `src/main.tsx` → `App.tsx` → `pages/Transactions.tsx`.
- Frontend dev server: `npm run dev` (Vite) — runs the UI in a browser at http://localhost:5173 by default.
- Full app (desktop + backend): `npm run tauri` (requires Rust toolchain + `@tauri-apps/cli`).

## Prerequisites
- Node.js (16+ recommended) and `npm` installed.
- Rust toolchain with MSVC on Windows (install via `rustup`), and Visual Studio Build Tools present for Tauri builds.
- `@tauri-apps/cli` (devDependency present in `package.json`), but ensure Rust toolchain is available for `tauri dev`.

## How to run (commands)
- Install deps (frontend):

```bash
npm install
```

- Run frontend-only (fast, in browser):

```bash
npm run dev
# open http://localhost:5173
```

- Run full Tauri app (desktop + backend):

```bash
npm run tauri
# This runs `tauri dev` and launches a desktop window connected to the Rust backend.
```

- Build release installer (when ready):

```bash
npm run tauri:build
```

## Notes on behavior
- The frontend calls backend APIs via `src/services/tauri-api.ts` using `invoke` from `@tauri-apps/api/tauri`.
- If you run only `npm run dev` (Vite), the UI will render, but any calls to Tauri `invoke` will fail or be unavailable in a plain browser environment. To exercise backend-backed flows (transactions CRUD, DB access), run `npm run tauri`.
- The Rust backend registers commands in `src-tauri/src/main.rs` and `src-tauri/src/commands.rs`.
- The SQLite DB path defaults to the OS app data folder (via `directories::ProjectDirs`) and can be overridden for testing by setting `CLINCHRFT_DB_PATH` environment variable.

## Which parts require Tauri vs frontend-only
- Requires Tauri (Rust backend) / Tauri invocation:
  - `src-tauri/src/commands.rs` (all DB-backed commands: `get_transactions`, `create_transaction`, etc.)
  - `src-tauri/src/main.rs` (tauri builder and invoke handler registration)
  - Any call paths that use `@tauri-apps/api/tauri` (`src/services/tauri-api.ts`)

- Pure frontend state/UI logic (can iterate in Vite):
  - `src/main.tsx`, `src/App.tsx`
  - `src/pages/Transactions.tsx`, `src/components/TransactionList.tsx`, `src/components/TransactionForm.tsx`
  - `src/lib/money.ts`, `src/types`, styles, etc.

## Acceptance criteria (manual checks)
- Frontend-only run (`npm run dev`) shows the app UI and page header "ClinchrFT (scaffold)".
- Full Tauri run (`npm run tauri`) opens a desktop window and the Transactions page loads without unhandled invoke errors.
- Creating/updating/deleting a transaction through the UI persists to the SQLite DB (check DB file under the app data folder or set `CLINCHRFT_DB_PATH` to a temp path and inspect it).

## Troubleshooting / common issues
- If `npm run tauri` fails, confirm Rust toolchain and MSVC build tools are installed (Windows requirement for building native parts).
- For test/dev isolation, set `CLINCHRFT_DB_PATH` to a temp file path before running to avoid modifying your real app data directory.

## Tasks for @engineer (execution checklist)
- [ ] Verify `npm install` completes on Windows with current `package.json`.
- [ ] Run `npm run dev` and confirm UI renders in browser.
- [ ] Run `npm run tauri` and confirm desktop window opens and backend commands work.
- [ ] Add a short dev note in `README.md` summarizing these steps.

---

Switch to a fresh session with the `@engineer` persona to execute the checklist above and run the app locally.
