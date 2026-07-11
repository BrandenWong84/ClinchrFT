# Clinchr Architecture

Stack: Tauri (Rust) backend + React + TypeScript frontend

High-level structure

- `src/` — React frontend application: components, pages, styles, and state management
- `src-tauri/` — Tauri Rust backend: command registration, database layer, and business logic
- `db/` — database schema and migration scripts
- `docs/` — documentation (architecture, API, security, developer guide)

Agent workflow

Architect → Database → Backend → Frontend → Charting → QA → Deployment

Notes

- v1 is Windows-first and local-only (no telemetry, no cloud sync).
- v1 stores data in `%APPDATA%/ClinchrFT` by default.
