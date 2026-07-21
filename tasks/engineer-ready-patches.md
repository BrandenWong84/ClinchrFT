## Ready-to-apply patches for the `@engineer` agent

Purpose

Provide copy/paste-ready content the `@engineer` persona should apply to the repository to persist the Tauri allowlist policy: update the engineer agent prompt, add CONTRIBUTING guidance, wire CI workflow, and update the PR template.

Instructions for `@engineer`

1. Apply the four sections below to the repository in separate commits.
2. Run the allowlist checker locally to verify:

```bash
node scripts/tauri-allowlist-checker.js
```

3. Push commits and open a PR. Ensure the PR description documents the mapping decisions.

Patch A — Engineer agent prompt snippet

File to edit: `.github/agents/engineer.agent.md`

Add this paragraph near the top of the engineer agent prompt file (verbatim):

"When making changes that touch Tauri or its front-end usage, follow the Tauri allowlist minimal-privilege policy: ensure `src-tauri/tauri.conf.json` is minimal, only add specific allowlist keys required for documented frontend usage, run `node scripts/tauri-allowlist-checker.js`, include a clear justification and mapping in the PR description, and never merge with `allowlist.all: true`. If a new Tauri API is needed, request a human review and document the security rationale in the PR."

Patch B — CONTRIBUTING.md snippet

File to edit/create: `docs/CONTRIBUTING.md`

Append the following short policy block to `docs/CONTRIBUTING.md`:

**Tauri allowlist policy**

- Keep `src-tauri/tauri.conf.json` minimal. Do not use `allowlist.all: true` in merge commits.
- Before adding Tauri native APIs, run the allowlist checker:

```
node scripts/tauri-allowlist-checker.js
```

- Document any added allowlist keys in the PR description with a mapping to frontend usage and a brief security justification.

Patch C — CI workflow

File to add: `.github/workflows/ci.yml`

Create this workflow file (YAML):

```yaml
name: CI
on: [push, pull_request]

jobs:
  test-and-check:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install JS deps
        run: npm ci
      - name: Run frontend tests
        run: npx vitest run
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@v1
        with:
          toolchain: stable
      - name: Run Rust tests
        run: cd src-tauri && cargo test --verbose
      - name: Run allowlist checker
        run: node scripts/tauri-allowlist-checker.js
```

Patch D — PR template checkbox

File to edit/create: `.github/PULL_REQUEST_TEMPLATE.md` (or repository PR template location)

Add the following checkbox to the template where change-related checkboxes live:

- [ ] tauri allowlist updated & justified (required if Tauri/native APIs added)

Commit guidance

- Make each patch a separate commit with a clear message: `chore: add Tauri allowlist policy (engineer prompt)`, `docs: add Tauri allowlist section`, `ci: add allowlist checker workflow`, `chore: PR template allowlist checkbox`.
- In the PR description, include the output of `node scripts/tauri-allowlist-checker.js` and any mapping notes.

Acceptance criteria

- `.github/agents/engineer.agent.md` contains the new paragraph.
- `docs/CONTRIBUTING.md` contains the policy block.
- `.github/workflows/ci.yml` exists and runs the checker.
- PR template contains the allowlist checkbox.

Next step

Run a fresh session with the `@engineer` persona and hand them this `tasks/engineer-ready-patches.md` file to implement the changes.
