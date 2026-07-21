One-paragraph summary:
- Added CSV import (preview + apply), CSV export, and local DB backup/restore. The Rust backend performs CSV parsing and validated imports (preview only first, then commit inside a DB transaction). The frontend exposes `Export` and `Import` flows and a simple preview modal that shows parsing results and allows committing the import.

Line-by-line explanation (annotated walkthrough):
- `src-tauri/src/commands.rs`:
  - `preview_import_csv(csv_text: String) -> ImportPreviewResult`: parses CSV using the `csv` crate, validates required fields (`date`, `amount`), converts amounts into integer cents (no floating point), detects simple duplicates against existing transactions, and returns a typed preview with per-row errors and duplicate flags.
  - `apply_import_csv(csv_text: String) -> u64`: parses the CSV again and inserts rows inside a single SQLite transaction. If any insert fails the transaction is rolled back and an error returned.
  - `export_transactions_csv(filter: Option<GetTransactionsFilter>) -> String`: queries transactions using existing pagination/filter helpers, writes a CSV file into the app data folder with a timestamped filename, and returns the path.
  - `create_backup(dest_path: String) -> String`: copies the current DB file to the provided destination path and returns that path.
  - `restore_backup(src_path: String) -> ()`: makes a safety copy of the current DB, attempts to replace it with the provided file, and on failure attempts to roll back to the previous DB.
- `src/services/tauri-api.ts`:
  - Added `exportTransactionsCsv`, `previewImportCsv`, `applyImportCsv`, `createBackup`, `restoreBackup` wrappers that call the corresponding Tauri commands via dynamic `invoke(...)`.
- `src/components/ImportPreview.tsx`:
  - A minimal UI component that accepts a CSV file via a file input, requests a preview from the backend, displays counts and the first N rows with errors, and allows the user to confirm (which calls the apply import command).
- `src/pages/Transactions.tsx`:
  - Added `Export` and `Import` buttons; `Export` triggers `exportTransactionsCsv` and notifies the user of the written path; `Import` opens the `ImportPreview` modal which refreshes the list after a successful import.

How to run and test locally (commands):

```powershell
# Type-check
npx tsc --noEmit
# Run frontend tests (Vitest)
npm test
# Run Rust tests in the Tauri backend
cd src-tauri
cargo test
# Start dev server + Tauri
npm run tauri
```

Suggested follow-ups / learning items:
- Add flexible column mapping and date-format selection into the preview UI.
- Implement streaming parsing for large files and progress reporting during apply.
- Improve amount parsing to be locale-aware (thousands separators, different decimal marks) and consider `rust_decimal` for precise currency handling.
- Add UI controls for duplicate resolution (skip/merge/force insert) and preview-editing of rows before commit.
