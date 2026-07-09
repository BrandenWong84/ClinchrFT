# Development Agents — Roles & How to Use Them

This project uses a role-based "agent" workflow to break work into clear responsibilities. These are *human-readable* templates and prompts you can use when assigning tasks or when asking an assistant (me) to act in a role.

Folder: `docs/agents/` contains one file per role with example prompts and checklists.

Quick usage

- Pick a role (Architect, Backend, Database, Frontend, Charting, Security, QA, Deployment).
- Use the example prompt in the role file as the starting message when asking for work from an agent or assistant.
- Each agent file includes inputs, outputs, acceptance criteria, and a short checklist.

Agent orchestration (example)

1. Run Architect to produce folder layout + high-level API surface.
2. Run Database to produce `db/schema.sql` and migrations.
3. Run Backend to implement Tauri commands that use the DB schema.
4. Run Frontend to implement UI components that call backend commands.
5. Run Charting to add visualization components using backend data.
6. Run Security and QA to audit and test.
7. Run Deployment to build an installer and release notes.

Notes

- These agents are process roles, not separate programs. I will act as each agent on demand and produce artifacts (files, code, tests) according to the prompts in `docs/agents/`.
- Treat each agent output as a small pull request: review, request changes, then merge.
