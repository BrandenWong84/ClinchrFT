# Clinchr — Copilot Instructions

Project goals
- Windows-first local-only personal finance tracker (no telemetry).
- Use Tauri (Rust) for backend; React + TypeScript for frontend.
- v1 stores data locally in `%APPDATA%/ClinchrFT` with no DB encryption.

Behavior guidelines for assistants
- Keep changes small and incremental; prefer PR-style artifacts.
- Always include tests for business logic and example usage for new commands.
- Avoid adding any network/telemetry code.
- Use integer cents or Decimal libraries for money calculations (no floats for currency).

Agent roles (short prompts)
- Architect: produce folder layout and API surface for a feature.
- Database: produce SQL migration and indexes.
- Backend: produce Tauri command implementation and unit tests.
- Frontend: produce React component + types + minimal UI tests.

Workflow
- Create feature branch `feature/<short>`.
- Produce artifacts per role as separate commits.
- Run CI and ensure tests pass before merge.

Files and folders of interest
- Root: `README.md`, `LICENSE`, `package.json`.
- Frontend: `src/`.
- Backend: `src-tauri/`.
- Agents: `.github/agents/` (repo-scoped prompts).

If unsure, ask the user a single clarifying question before making changes.
