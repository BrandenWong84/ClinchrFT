# Agent Guidelines — ClinchrFT

Purpose: canonical guidance for planner and engineer agents working on this repository. Agents must read this file before proposing or implementing changes.

## Runtime boundaries
- Persistence, schema, and DB logic belong in the Tauri (Rust) backend under `src-tauri/`.
- UI, state, and presentation logic belong in the frontend under `src/` (React + TypeScript).
- The frontend↔Tauri bridge is `src/services/tauri-api.ts` — update it when adding or changing Tauri commands.

## Where to look
- Frontend: `src/` (pages, components, services, lib, types)
- Tauri commands & DB: `src-tauri/src/commands.rs`, `src-tauri/src/db.rs`
- Tests: `tests/` (frontend) and Rust unit tests in `src-tauri` modules

## ESM / Tooling notes
- `package.json` uses `type: "module"`; runtime imports in `src/` should include `.js` where imported in the browser.
- `tsconfig.json` uses `module: NodeNext` / `moduleResolution: nodeNext` for ESM compatibility.
- Node-only scripts should be `.cjs` and referenced from `package.json` and CI accordingly.

## Verification checklist (run before opening PR)
- `npx tsc --noEmit` → no type errors.
- `npm test` → tests pass.
- `npm run dev` and exercise the UI at `http://localhost:5173` → no import or Tauri invocation errors in browser console.
- If Rust changes are included: run `cargo test` inside `src-tauri` and ensure DB migrations/tests pass.

## Changing the runtime surface (required steps)
If a change affects persistence, schema, or Tauri command signatures, include:
1. Rust changes: `src-tauri/src/db.rs` (schema/migrations) and `src-tauri/src/commands.rs` (commands).
2. Update `src/services/tauri-api.ts` with matching `core.invoke` call shapes.
3. Add/update Rust unit tests and frontend tests in `tests/`.
4. Run `npx tsc --noEmit`, `npm test`, and `cargo test` locally.

## Agent behavior
- Planner agents: produce small, testable tasks that explicitly state whether they require Tauri/Rust changes or are frontend-only.
- Engineer agents: implement only what's in the task, include tests, and run verification steps above before merging.

---
Always read this file at the start of a new session and follow its guidance.
