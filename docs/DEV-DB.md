# Dev DB & Migrations Notes

Purpose
- Quick reference for running the SQLite-backed DB and migrations during development and tests.

Files and locations
- SQL migration files: `db/migrations/` (ordered numeric prefixes). These are applied by the runtime migration runner located in `src-tauri/src/db.rs`.
- Runtime DB path: by default the app uses `%APPDATA%/ClinchrFT/clinchrft.db` on Windows. Override during dev via `CLINCHRFT_DB_PATH` environment variable.

Run migrations and tests
- Run the Rust tests which also exercise DB helpers and migrations:

```powershell
cd src-tauri
cargo test
```

- To run the Tauri dev server while pointing to a temporary DB for manual testing:

```powershell
set CLINCHRFT_DB_PATH=E:\temp\clinchrft-dev.db
npm run tauri
```

Notes
- The runtime migration runner will create or migrate the DB on startup. If you need to reset state during development, delete the DB file pointed to by `CLINCHRFT_DB_PATH`.
- Always run `cargo test` after changing migrations or schema structs in `src-tauri/src/db.rs` to ensure Serde and SQL mappings stay consistent.
