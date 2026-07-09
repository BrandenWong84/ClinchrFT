ClinchrFT — Initial Scaffold Specification
Overview

Goal: Provide a minimal, well-organized scaffold for a Windows-first, local-only Tauri + React + TypeScript app with a Rust backend and SQLite storage. This checklist guides the @engineer agent to create files/folders and marks which work requires Tauri commands vs frontend-only logic.
Acceptance criteria

Project builds locally for dev (frontend + tauri dev) on Windows.
Frontend communicates with Rust backend through explicit Tauri commands.
DB created under %APPDATA%/ClinchrFT and migrations available.
Money uses integer cents (or Decimal lib) across codebase.
Tests included for core business logic (frontend and Rust).
Checklist (high level)

 Create root-level files
README.md — project overview + dev/run steps.
LICENSE, .gitignore, package.json, tsconfig.json, lockfile.
tauri.conf.json / src-tauri/tauri.conf.json.
Cargo.toml at src-tauri/Cargo.toml.
 Frontend: src/ (React + TypeScript)
src/index.tsx — app entry.
src/App.tsx — root router + layout.
src/pages/ — Dashboard, Transactions, Accounts, Categories, Settings, ImportExport.
src/components/ — TransactionList, TransactionForm, AccountList, CategoryPicker, chart wrappers.
src/services/tauri-api.ts — wrappers around invoke (frontend-only wrappers).
src/state/ — app state (Zustand or Redux) and hooks (pure frontend).
src/lib/money.ts — integer cents helpers and formatting (pure frontend).
src/types/ — shared TypeScript types (Transaction, Account, Category).
public/ — static assets and index.html.
tests/ — Jest/React Testing Library tests for UI and business logic.
 Tauri backend: src-tauri/ (Rust)
src-tauri/src/main.rs — Tauri setup and command registration.
src-tauri/src/commands.rs — all Tauri #[tauri::command]-exposed functions (REQUIRED).
Commands: get_transactions, add_transaction, update_transaction, delete_transaction, get_accounts, get_categories, import_csv, export_csv, run_migration, backup_db, restore_db, get_app_path.
src-tauri/src/db.rs — SQLite wrapper + migrations runner.
src-tauri/Cargo.toml — deps: tauri, rusqlite/sqlx, serde, anyhow, rust_decimal (optional), directories.
src-tauri/tauri.conf.json — Tauri config for Windows packaging.
src-tauri/tests/ — Rust unit tests for DB/business logic.
 Database
db/ — migrations and schema.sql.
db/migrations/0001_create_schema.sql (and incremental migrations).
Runtime DB location: %APPDATA%/ClinchrFT/clinchrft.db.
 Build & Scripts
Root package.json scripts: dev (frontend + tauri dev), build (frontend + tauri build), test.
Helper scripts for migrations and packaging.
 CI
ci.yml — lint, frontend + Rust tests, build verification.
 Docs & onboarding
architecture.md — high-level architecture and IPC contract (command names, payloads, error shapes).
docs/dev-setup-windows.md — Windows dev setup steps.
 Security & privacy notes
docs/privacy.md — local-only storage, no telemetry, DB location and OS protections.
 Packaging & installer
Tauri build configuration for producing an .msi/.exe.
Tauri command vs frontend-only mapping

Tauri command REQUIRED (src-tauri/src/commands.rs)
Any operation touching filesystem or DB:
CRUD transactions/accounts/categories
Import/export CSV
Run/rollback migrations
Backup/restore DB
Read/write persistent settings
Rationale: keep disk/DB access in trusted Rust layer; frontend never accesses filesystem directly.
Frontend-only (pure UI/state)
UI rendering, forms, routing, client-side validation, charts, ephemeral caches.
src/services/tauri-api.ts are pure wrappers that call Tauri commands via invoke.
Suggested file/folder tree (concise)

/
README.md, package.json, tsconfig.json, .gitignore
tasks (this spec)
db/
migrations/
src/
index.tsx, App.tsx
pages/, components/, services/, state/, types/, lib/, tests/
public/
src-tauri/
Cargo.toml, tauri.conf.json
src/
main.rs, commands.rs, db.rs, models.rs, errors.rs, tests/
Developer notes & constraints

Money: use integer cents (i64) OR rust_decimal + JS Decimal; ensure consistent IPC typing.
DB: SQLite with migrations in db/migrations/.
App data path: use directories crate to target %APPDATA%/ClinchrFT.
No telemetry/network: do not add network/telemetry deps or outbound calls.
Teaching artifacts: For every change, engineer must include:
One-paragraph summary of change + why.
Line-by-line explanation for unfamiliar devs.
How to run and test locally (commands).
Suggested follow-up learning items.
Implementation TODOs for @engineer (first sprint)

 Initialize repo metadata: package.json, tsconfig.json, root README.
 Scaffold src/ with minimal App and Transactions demo page (mocked data).
 Scaffold src-tauri/ with main.rs and empty commands.rs stubs.
 Add DB folder + first migration 0001_init.sql.
 Add src/services/tauri-api.ts with stubbed invoke calls matching commands.rs.
 Add tests: one frontend unit test for money utils; one Rust unit test for DB init.
 Document dev run steps in README.
Notes for @engineer

Commit incrementally on branch feature/scaffold.
Provide required teaching artifacts alongside each PR.
After stubbing, run tauri dev on Windows to validate IPC contract; iterate commands and frontend invoke wrappers.