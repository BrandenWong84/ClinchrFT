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
- Teaching requirement: every code or doc change must include both a concise summary and a more detailed explanation aimed at a non-developer learner. For code changes include:
	1. A one-paragraph summary of what changed and why.
	2. A line-by-line explanation (or annotated code) for unfamiliar developers.
	3. How to run and test the change locally (commands).
	4. Suggested follow-up learning items or references.

Agent roles (short prompts)
- Planner: break features into small tasks, define acceptance criteria and tests.
- Generator: implement small tasks (code, migrations, tests) and provide developer notes and the required teaching explanations.
- Evaluator: run and/or produce tests, validate acceptance criteria, check security/data integrity, and report issues with remediation steps.

Workflow
- Create feature branch `feature/<short>`.
- Use the Planner → Generator → Evaluator sequence for each task.
- Each Generator change must include the teaching artifacts described above.
- Produce artifacts per role as separate commits and open a PR for review.
- Run CI and ensure tests pass before merge.

Files and folders of interest
- Root: `README.md`, `LICENSE`, `package.json`.
- Frontend: `src/`.
- Backend: `src-tauri/`.
- Database migrations: `db/migrations/` or `db/schema.sql`.
- Agents: `.github/agents/` (repo-scoped prompts).

Project requirements (captured):
- Windows-first, local-only desktop app packagable as a standalone `.exe` (Tauri builds installers).
- Core features for MVP: add/edit/delete transactions, categories, accounts; filter transactions by date range and category; visualizations (bar/line trends, pie/category breakdown); CSV export/import; settings and backups.
- Use SQLite for local storage; no telemetry or remote sync in v1.
- Use Decimal/integer cents for monetary values; ensure accurate aggregations and avoid floating point errors.
- Security: v1 stores DB in `%APPDATA%/ClinchrFT`; document risks and recommend OS-level protections.

Learning expectations
- The user prefers in-depth, learner-focused explanations. For each feature or PR, include a short conceptual overview, a step-by-step implementation walkthrough, and optional further reading so the user can learn the concepts used.
# User Profile & Learning Persona
- **Role:** Product Manager expanding technical capabilities.
- **Technical Level:** Practical/Functional. Needs clear conceptual bridging.
- **Explanation Style:** High-level architectural explanations paired with clear "why" context. Avoid opaque, overly dense engineering jargon without first explaining the underlying mechanic (e.g., explain *why* we pass data a certain way between Tauri and React).
- **Goal:** Deepen hands-on technical understanding of Tauri, Rust, and React systems through practical development.

If unsure, ask the user a single clarifying question before making changes.

Agent usage guidance
- Use `.github/agents/planner.agent.md`, `.github/agents/engineer.agent.md`, and `.github/agents/reviewer.agent.md` as the canonical prompts for repo-scoped agent interactions.
- Workflow recommendation: Planner → Engineer → Reviewer for each small task.
