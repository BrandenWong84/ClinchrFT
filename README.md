ClinchrFT — Initial Scaffold

This repository contains a minimal scaffold for a Windows-first, local-only Tauri + React + TypeScript app with a Rust backend and SQLite storage.

Teaching artifacts have moved to the dedicated file: docs/learning-artifacts.md

See the learning artifacts for this change and the template for future changes in [docs/learning-artifacts.md](docs/learning-artifacts.md#L1).
# ClinchrFT
Clinchr Financial Tracker - Tauri + React + TypeScript

## Overview
Clinchr is a local-only, Windows-first personal finance tracker. It stores data locally under the user's application data folder and does not transmit telemetry or sync data to external servers.

See `docs/ARCHITECTURE.md` and `docs/SECURITY.md` for project structure and security notes.

## Developer Quickstart

- Frontend dev server (fast, browser):

```bash
npm install
npm run dev
# open http://localhost:5173
```

- Full desktop (Tauri + Rust backend):

```bash
# Requires Rust toolchain + Visual Studio Build Tools on Windows
npm run tauri
```

- Notes: backend stores the SQLite DB under the OS app-data folder by default. To override for testing, set `CLINCHRFT_DB_PATH` to a temporary file path before launching.

Repo-local DB for development

- To make development easier you can run the app against a repo-local DB at `./data/clinchrft.db` by setting the environment flag `CLINCHRFT_USE_REPO_DB`.
- PowerShell example (repo root):

```powershell
Set-Location 'E:\path\to\repo'
$env:CLINCHRFT_USE_REPO_DB = '1'
npm run tauri
```

- Alternatively set `CLINCHRFT_DB_PATH` explicitly to any path (absolute preferred):

```powershell
$env:CLINCHRFT_DB_PATH = (Resolve-Path .\data\clinchrft.db).Path
npm run tauri
```

- Backup / migration note: when switching DB paths, copy your existing DB file to the new location or run the migration SQL files in `db/migrations/` (the runtime `run_migrations()` enforces schema at startup).
