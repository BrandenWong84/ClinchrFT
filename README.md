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
