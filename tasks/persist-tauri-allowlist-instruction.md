## Persisting the Tauri allowlist guidance for the `@engineer` agent

Purpose

Provide a durable, discoverable instruction that the `@engineer` persona must follow: always keep `src-tauri/tauri.conf.json` minimal, expand permissions only after human review, document allowlist changes in the PR, and run the allowlist checker.

Where to store (recommended)

- Primary: repository-scoped engineer agent prompt: `.github/agents/engineer.agent.md` (or similar agent prompt file). Put the short directive near the top so it is invoked for every engineer session.
- Secondary (backup / human-facing): `docs/CONTRIBUTING.md` or `README.md` with the policy and how to run the checker locally.
- Enforcement: keep `tasks/todo-tauri-allowlist-checker.md` and the checker script in `scripts/` plus CI workflow to prevent bypass.

Exact short instruction to add to the engineer agent prompt

Add this paragraph (copy verbatim) to the engineer agent prompt file so it is enforced for all engineering sessions:

"When making changes that touch Tauri or its front-end usage, follow the Tauri allowlist minimal-privilege policy: ensure `src-tauri/tauri.conf.json` is minimal, only add specific allowlist keys required for documented frontend usage, run `node scripts/tauri-allowlist-checker.js`, include a clear justification and mapping in the PR description, and never merge with `allowlist.all: true`. If a new Tauri API is needed, request a human review and document the security rationale in the PR."

Suggested edits to repo files (actionable to hand to `@engineer`)

- Update `.github/agents/engineer.agent.md` to include the paragraph above.
- Add a short entry to `docs/CONTRIBUTING.md` explaining the policy and the local command:

```
node scripts/tauri-allowlist-checker.js
```

- Add/ensure CI workflow `.github/workflows/ci.yml` runs the checker and fails when `allowlist.all` is true (see `tasks/todo-tauri-allowlist-checker.md`).
- Update PR template to include a checkbox: "tauri allowlist updated & justified".

Notes on persistence & visibility

- Agent prompts (`.github/agents/*.md`) are the most direct way to make the instruction enforced for the `@engineer` persona.
- Redundancy: keep the same policy in `docs/CONTRIBUTING.md` so humans and non-agent tooling see it.
- CI enforcement prevents accidental merges even if an instruction is missed.

Acceptance criteria for this change

- The engineer agent prompt includes the instruction paragraph above.
- `docs/CONTRIBUTING.md` documents policy and local checker command.
- CI on PRs runs the checker and fails when `allowlist.all` is true.
- PR template contains the checkbox for allowlist changes.

Next step

Pass this `tasks/persist-tauri-allowlist-instruction.md` file to the `@engineer` persona in a fresh session and ask them to implement the suggested edits: update the engineer agent prompt, add the docs entry, wire the CI, and update the PR template.
