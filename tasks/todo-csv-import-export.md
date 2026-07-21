# Todo: CSV Import & Export (tasks/todo-csv-import-export.md)

Summary
- Goal: Add CSV export, CSV import (with preview/mapping), and simple local backup/restore for the app database.
- Branch: `feature/csv-import-export`
- Priority: Medium

Scope & separation
- Tauri (Rust) responsibilities (must be implemented in `src-tauri`):
  - Add Tauri commands in `src-tauri/src/commands.rs` and DB helpers in `src-tauri/src/db.rs`:
    - `export_transactions_csv(start_date?: String, end_date?: String, filter?: GetTransactionsFilter) -> String` — returns path to exported CSV file or writes to a user-selected path.
    - `import_transactions_csv(file_path: String, options: ImportOptions) -> ImportResult` — parse CSV, validate rows, return a summary of parsed rows (not yet persisted) for preview, and on confirm commit rows in a DB transaction.
    - `create_backup(dest_path: String) -> String` — copy DB file to `dest_path`.
    - `restore_backup(src_path: String) -> Result` — validate then atomically replace current DB with the selected backup (with safe rollback on error).
  - Use well-tested Rust crates: `csv` for parsing, `serde` for deserialization, and `tempfile` if needed for staging.
  - CSV import must be implemented in two phases:
    1. Parse & validate only (no writes). Return typed preview results including row index, parsed transaction object, and per-row validation errors.
    2. On frontend confirmation, call a separate command (or same command with an `apply=true` flag) to persist rows inside a single DB transaction; if any write fails, rollback.
  - Ensure CSV parsing uses project money rules (store amounts in integer cents). Reject rows with ambiguous/missing currency or malformed amounts.
  - Add Rust unit tests for parser/validator and an integration test that runs import with a temporary SQLite DB file.
  - Update `src-tauri/tauri.conf.json` allowlist if filesystem/dialog access is required.

- Frontend (React/TypeScript) responsibilities (implement under `src/`):
  - UI changes:
    - Add `Export` button and `Import` button in `src/pages/Transactions.tsx` (or a small toolbar component) to trigger export/import flows.
    - Build an `ImportPreview` modal component that:
      - Shows parsed rows with validation status.
      - Allows column mapping (CSV column -> transaction field) and basic transforms (date format selector, currency/amount column selection, decimal/cents handling).
      - Shows summary counts: good rows, rows with warnings, rows with errors.
      - Allows user to confirm (persist) or cancel.
    - Add progress and success/error notifications.
  - API surface:
    - Extend `src/services/tauri-api.ts` with typed wrappers for the new commands: `exportTransactionsCsv`, `previewImportCsv`, `applyImportCsv`, `createBackup`, `restoreBackup`.
  - CSV preview/parsing helpers (client-side):
    - Optional lightweight client-side CSV sniffing to populate column mapping UI before handing file path to Tauri (use `Papaparse` or the browser's `FileReader`). Keep heavy parsing in Rust.
  - Tests:
    - Vitest unit tests for the mapping helpers and `ImportPreview` component behaviour.
    - Integration test (jsdom) that simulates selecting a small CSV and verifies the preview -> confirm flow calls the expected `tauri-api` functions.

Acceptance criteria
- Export: user can export the visible transaction set to a valid CSV file; the CSV opens in common spreadsheet apps and contains expected headers and rows.
- Import preview: uploading a CSV presents a preview with clear mapping and validation; rows with errors are flagged and not persisted unless fixed.
- Import commit: confirming import persists only validated rows (or all rows atomically) based on chosen behaviour and updates the UI list.
- Backup/restore: user can create a DB backup file and restore it. Restores must be reversible or fail-safe with clear error messages.
- Tests: Rust parser/unit tests and frontend Vitest tests added and passing locally.

Design/implementation details & constraints
- CSV format and headers: define a recommended set of headers in docs/learning-artifacts.md and accept flexible column mapping in the preview UI.
- Money: parse amounts into integer cents using `src/lib/money.ts` rules; reject ambiguous decimal separators without explicit selection.
- Dates: accept ISO-8601 by default; provide common format patterns in mapping UI (MM/DD/YYYY, DD/MM/YYYY).
- Duplicates: import should detect potential duplicate transactions (same date, account, amount, and memo) and mark as duplicates; UI should allow skipping duplicates or forcing insert.
- Large files: for very large CSVs prefer server/Rust streaming parsing. The `import_transactions_csv` command should support streaming/iterative apply or a bulk transaction mode. If large-file support is needed, add progress callbacks/events.
- Security/privacy: all file reads/writes must be local only; do not add any network endpoints or telemetry.

Files to update (suggested)
- Tauri: `src-tauri/src/commands.rs`, `src-tauri/src/db.rs`, optionally `src-tauri/src/main.rs` (if registering new commands), `src-tauri/tauri.conf.json`.
- Frontend: `src/services/tauri-api.ts`, `src/pages/Transactions.tsx`, `src/components/ImportPreview.tsx` (new), `src/components/Toolbar.tsx` (optional), `src/lib/money.ts` (reuse/confirm behaviour), update tests under `tests/`.

Testing requirements (explicit)
- Rust tests:
  - Unit tests for CSV parser and validator functions.
  - Integration test using a temporary DB: parse a sample CSV, apply import, query DB and assert row counts and values (amounts stored as integer cents).
- Frontend tests:
  - Vitest unit tests for mapping helpers and `ImportPreview` behaviour (mapping, validation display, confirm/cancel calls).
  - Component test for `Transactions` page that mocks `tauri-api` and verifies export/import button flows.
- Verification steps before PR:
  - `npx tsc --noEmit`
  - `npm test` (Vitest)
  - `cargo test` in `src-tauri`
  - Manual smoke: `npm run dev` then import/export a small CSV locally.

Teaching artifacts (required)
Per project policy, every code change must include teaching artifacts. For the `@engineer` implementation commit/PR include the following files/sections:
- Add a short teaching note into `docs/learning-artifacts.md` describing CSV import/export feature.
- In the PR description or a separate `docs/learning-artifacts/csv-import-export.md` include:
  1. One-paragraph summary of what changed and why.
  2. Line-by-line explanation or annotated walkthrough for non-Rust/JS developers covering the import pipeline (parse -> validate -> preview -> commit).
  3. How to run and test the change locally (commands to run; e.g., `npx tsc --noEmit`, `npm test`, `cargo test`, manual import steps).
  4. Suggested follow-up learning items (e.g., streaming CSV parsing, incremental import UX patterns, security considerations for local file handling).

Open implementation checklist (for the `@engineer`)
- [ ] Create branch `feature/csv-import-export`.
- [ ] Add Tauri commands and DB helper functions (`export`, `preview import`, `apply import`, `backup`, `restore`).
- [ ] Add Rust unit and integration tests for CSV parsing and import.
- [ ] Update `src/services/tauri-api.ts` with typed wrappers.
- [ ] Implement `ImportPreview` component and wire import/export UI in `Transactions` page.
- [ ] Add Vitest tests for mapping helpers and UI components.
- [ ] Update `docs/learning-artifacts.md` with a CSV import/export entry.
- [ ] Run verification steps and fix issues until green.
- [ ] Open PR with teaching artifacts and testing evidence (screenshots, test outputs).

Estimated effort
- 1.5–3 days (single engineer) depending on scope for large-file streaming or fancy mapping UX.

Acceptance tests (manual)
- Export a filtered date-range: open in Excel/LibreOffice and verify headers and values.
- Import a 20-row CSV with one invalid row: preview shows 19 valid + 1 error; confirm persists 19 rows.
- Create backup then restore it and confirm DB state matches.

Notes
- Coordinate with the team if changing `tauri.conf.json` allowlist; keep allowlist minimal.
- Prefer incremental commits (parser + tests first, then preview UI, then commit/apply).

Next step
- Transition to a fresh session as the `@engineer` persona to implement this checklist.
