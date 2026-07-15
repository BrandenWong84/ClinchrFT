---

Change: Add `build.devPath` to `src-tauri/tauri.conf.json` to enable `tauri dev`
- One-paragraph summary:
	- Added `build.devPath` pointing at the running Vite dev server (`http://localhost:5173`) so `tauri dev` uses the live dev server instead of requiring an on-disk `dist` folder. This prevents `tauri::generate_context!()` from panicking when `build.frontendDist` (`../dist`) is absent during development.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json` `build.devPath`: set to `http://localhost:5173` which tells the Tauri dev process to load the renderer from the Vite dev server during `tauri dev` runs.
	- `build.frontendDist` remains `../dist` for production builds (packaging), while `devPath` is only used in development.
	- `build.beforeDevCommand`: left as `npm run dev` to ensure Vite is started before Tauri attempts to connect to `devPath`.
- How to run and test locally (commands):

```powershell
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
# Start full Tauri dev (this will run the `beforeDevCommand` and point the app at the Vite server)
npm run tauri
```

- Expected outcome:
	- Vite starts on `http://localhost:5173` and Tauri connects to that address; `tauri::generate_context!()` will not panic about a missing `../dist` folder during development.
- Reviewer next steps / handoff:
	- Verify `npm run tauri` no longer panics with `The "frontendDist" configuration is set to "../dist" but this path doesn't exist`.
	- If the project uses a non-default Vite port, update `build.devPath` accordingly.
	- Optionally, if you prefer the alternative workaround, create an empty `dist` folder or run `npm run build` prior to `npm run tauri`.

Change: Ignore `src-tauri/target` in Vite watcher to avoid Windows EBUSY
 - One-paragraph summary:
	 - Added a Vite server watch ignore pattern to prevent Vite from attempting to watch Cargo build artifacts under `src-tauri/target`. On Windows those files can be locked/executing during `cargo` builds and cause `EBUSY` errors that crash the dev flow (`npm run tauri`). This change keeps the frontend watcher focused on source files only.
 - Line-by-line explanation:
	 - `vite.config.js` `server.watch.ignored`: adds the glob `**/src-tauri/target/**` so Vite (chokidar) will not try to watch the Cargo `target` tree. This avoids errors when build scripts create/execute files in that folder.
 - How to run and test locally (commands):

```powershell
# validate tauri config + allowlist checker (unchanged steps)
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js

# Start Tauri dev (should no longer error with EBUSY from watcher)
npm run tauri
```
 - Expected outcome:
	 - Vite starts its dev server without an `EBUSY` watcher error; Cargo can build native artifacts under `src-tauri/target` without interfering with Vite's file watcher.
 - Suggested follow-up learning items or references:
	 - Read chokidar/watchman docs and Vite's watcher configuration options.
	 - If other build artifacts are created elsewhere, add similar ignore globs to `vite.config.js`.
 - Reviewer next steps / handoff to `@reviewer`:
	 - Pull the change, run the commands above on Windows, and confirm `npm run tauri` completes without the previous EBUSY watcher error.
	 - If the error persists, capture the dev logs and consider also excluding other generated folders (e.g., `**/target/**`), or running the frontend and Cargo builds as separate processes during development.
Run Locally — Checklist

One-paragraph summary:
 - A concise developer checklist for running the project locally: frontend-only via Vite for fast UI iteration, and full Tauri dev for desktop + Rust backend flows. Includes commands, prerequisites, and acceptance criteria so reviewers can validate the environment and CRUD behavior without surprises.
Line-by-line explanation / mapping:
 - `npm install`: install JS dependencies for the frontend and tooling.
 - `npm run dev`: starts the Vite dev server and serves the React app in a browser (no Tauri backend).
 - `npm run tauri`: runs the Tauri dev flow (frontend + Rust backend) using the local `@tauri-apps/cli` binary; requires Rust toolchain and Windows build tools to compile native parts.
 - `CLINCHRFT_DB_PATH` env var: optional override for the SQLite DB file location used by the Rust backend for easier test isolation.

How to run and test locally (commands):
```powershell
# Install JS deps
npm install

# Frontend-only (fast iteration)
npm run dev
# open http://localhost:5173

# Full desktop + backend (requires Rust toolchain + MSVC build tools)
npm run tauri
```

Acceptance criteria (manual checks for reviewer):
 - Frontend-only run (`npm run dev`) shows the app UI and top-level header.
 - Full Tauri run (`npm run tauri`) launches a desktop window and the Transactions page loads without unhandled `invoke` errors.
 - Creating/updating/deleting a transaction in the UI persists to the SQLite DB (check the DB file under the OS app-data folder or use `CLINCHRFT_DB_PATH` to point to a temp file and inspect it).

Reviewer next steps / handoff to `@reviewer`:
 - On a Windows dev machine with Rust + MSVC installed, run the commands above and confirm the acceptance criteria.
 - If `npm run tauri` fails, capture the output and verify the Rust toolchain, `@tauri-apps/cli` availability, and Visual Studio Build Tools presence.
 - Attach any dev logs or `cargo test` output to the PR for traceability.

Implementation note for this change:
 - Added a short `Developer Quickstart` to the repository `README.md` and appended this checklist to `docs/learning-artifacts.md` so reviewers and contributors have a minimal, copy-pasteable set of steps to run the project locally.

ClinchrFT — Learning Artifacts

This file contains the teaching artifacts and the template that should accompany implementation changes.

1) One-paragraph summary of the change
- (Example) Added a minimal project scaffold that includes a frontend React + TypeScript app, Rust Tauri backend stubs, a first SQLite migration, and basic test scaffolding. The scaffold provides the IPC command names and simple implementations so frontend and backend can be iterated on together.

2) Line-by-line explanation (or annotated code) for unfamiliar developers
- `package.json`: project metadata and scripts for dev/build/test.
- `tsconfig.json`: TypeScript compiler options for the frontend.
- `.gitignore`: common ignores for node, build artifacts, and editor files.
- `src/`: React app entry (`main.tsx`), `App.tsx`, a demo `Transactions` page, basic types, money helpers, and a Tauri API wrapper.
- `public/index.html`: HTML entry for Vite/static dev server.
- `tests/money.test.ts`: unit test for money helpers.
- `db/migrations/0001_init.sql`: initial SQL schema for transactions, accounts, categories.
- `src-tauri/`: Rust Tauri project with `main.rs`, `commands.rs` stubs, `db.rs` helper, `Cargo.toml`, and `tauri.conf.json`.

3) How to run and test locally (commands)
- Install JS deps and run the frontend dev server:

```bash
npm install
npm run dev
```

- Run Tauri dev (separate terminal; requires Rust + Tauri toolchain on Windows):

```bash
cd src-tauri
cargo install tauri-cli --locked   # if not already installed
cargo tauri dev
```

- Run frontend unit tests:

```bash
npm test
```

4) Suggested follow-up learning items or references
- Implement a migrations runner in `src-tauri/src/db.rs` that executes SQL files from `db/migrations/` at startup.
- Replace frontend mock data with `invoke` calls to Tauri commands and add error handling.
- Add CI to run `npm test` and `cargo test`.

5) Implementation TODOs (for engineers)
- Create feature branch `feature/scaffold` and commit small, focused changes.
- Implement migration executor and persistent DB path under `%APPDATA%/ClinchrFT`.
- Add CRUD commands in `src-tauri/src/commands.rs` and corresponding frontend wrappers in `src/services/tauri-api.ts`.

---

Change: Migrate `src-tauri/tauri.conf.json` to Tauri v2 schema and make the allowlist checker robust
- One-paragraph summary:
	- Updated `src-tauri/tauri.conf.json` to the Tauri v2 configuration shape (top-level `productName`, `version`, `identifier`, `build.frontendDist`, `app`, and `bundle`) so the installed `@tauri-apps/cli` can parse and accept the file. Removed an unsupported top-level `allowlist` block (the v2 schema doesn't expect it). Also updated `scripts/tauri-allowlist-checker.js` to detect an allowlist if present in either the legacy (`tauri.allowlist`) or alternative (`allowlist`) shapes so the checker remains useful without forcing an invalid config shape.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json`: moved `productName`/`version` from `package`, moved `identifier` from `tauri.bundle`, replaced `devPath`/`distDir` with `build.frontendDist` and `beforeDevCommand`/`beforeBuildCommand`, added a minimal `app.windows` entry and `bundle.active` to satisfy the schema. Removed `allowlist` because the CLI rejected that top-level key.
	- `scripts/tauri-allowlist-checker.js`: replaced the previous direct access to `tauriConf.tauri.allowlist` with a tolerant lookup that prefers `tauriConf.tauri.allowlist` but falls back to `tauriConf.allowlist`. The script still writes `allowlist-report.json` and only exits non-zero when `all: true` is detected in the discovered allowlist object.
- How to run and test locally (commands):

```powershell
# Validate JSON and run the allowlist checker
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js

# Confirm Tauri CLI accepts the updated config
npx tauri info --verbose > tauri-info.log 2>&1
``` 

- Reviewer next steps / handoff:
	- Verify `npx tauri info --verbose` completes without schema validation errors (attach `tauri-info.log`).
	- Note: after this change `npx tauri info` may surface version mismatches between the Rust crates and NPM packages (e.g., `tauri` crate v1 vs `@tauri-apps/api` v2). If you want to update crate/npm versions to align major versions, do that in a follow-up PR and document the security/compat rationale.


Template: For every subsequent change, include the following sections in a `docs/learning-artifacts.md` entry or separate file attached to the PR:

- One-paragraph summary
- Line-by-line explanation / annotated code
- How to run and test locally (commands)
- Suggested follow-up learning items
- Implementation TODOs

---

6) Change: Add Tauri build script to enable `cargo test`
- One-paragraph summary:
	- Added `src-tauri/build.rs` and a `build-dependencies` entry for `tauri-build` in `src-tauri/Cargo.toml`. This ensures `tauri_build::build()` runs at build time, producing the generated context files required by `tauri::generate_context!()` so `cargo test` and other compile-time operations succeed.
- Line-by-line explanation:
	- `src-tauri/build.rs`: defines `fn main()` which calls `tauri_build::build();` — this invokes the Tauri build helper to process `tauri.conf.json` and bundle assets into the compiler `OUT_DIR`.
	- `src-tauri/Cargo.toml` addition: the `[build-dependencies]` table includes `tauri-build` so the build script can link and call into the helper at compile time.
- How to run and test locally (commands):

```bash
cd src-tauri
cargo clean
cargo test --verbose 2>&1 | Out-File -FilePath '..\\cargo-test.log' -Encoding utf8
``` 

- Suggested follow-up learning items:
	- Read Tauri's build-time codegen docs and `generate_context!()` macro behavior.
	- Explore `OUT_DIR` usage in Rust build scripts and how generated artifacts are discovered by macros.
- Implementation TODOs for reviewer / next steps:
	- Verify `tauri.conf.json` exists at project root or `src-tauri/` and is valid JSON.
	- Run `cargo test` on Windows with MSVC toolchain installed; if linking issues occur, ensure Visual Studio Build Tools and WebView2 runtime are present.
	- If CI runs on non-Windows runners, consider gating Tauri-native tests or using feature flags to allow cross-platform test runs.

9) Change: Add Tauri allowlist checker and CI enforcement
- One-paragraph summary:
	- Added a repository-level checker script (`scripts/tauri-allowlist-checker.js`), updated the CI workflow to run frontend and Rust tests and then the checker, and added a PR checklist item to require documenting any Tauri allowlist changes. The checker produces `allowlist-report.json` and fails CI if `tauri.conf.json` uses `allowlist.all: true` so reviewers can enforce a minimal allowlist.
- Line-by-line explanation:
	- `scripts/tauri-allowlist-checker.js`: static Node script that scans `src/` for common Tauri API usage patterns and `src-tauri/src/` for `#[tauri::command]` functions; writes `allowlist-report.json` at repo root and exits non-zero when `tauri.conf.json` has `tauri.allowlist.all: true`.
	- `.github/workflows/ci.yml` (updated): installs Node deps, runs frontend tests (`npx vitest run`), sets up Rust and runs `cargo test`, then runs the allowlist checker step.
	- `.github/PULL_REQUEST_TEMPLATE.md` (updated): adds a checklist line `tauri allowlist updated & justified` to ensure PR authors document any add/remove of native API usage.

- How to run and test locally (commands):

```bash
npm ci
npx vitest run
cd src-tauri && cargo test --verbose
cd ..
node scripts/tauri-allowlist-checker.js
```

- Suggested follow-up learning items:
	- Review Tauri `tauri.conf.json` allowlist keys and map frontend `@tauri-apps/api` usage to required keys.
	- Run the checker after adding any new Tauri API usage and include the `allowlist-report.json` in the PR description.

- Implementation TODOs (for engineers / reviewers):
	- Run the checker and inspect `allowlist-report.json` to create a minimal `src-tauri/tauri.conf.json` allowlist (do not set `all: true`).
	- Document mapping decisions in the PR description: which frontend calls require which allowlist keys and why.
	- Consider adding the checker execution result as an artifact in CI for easy review.

---

Change: Fix Vitest test discovery when `vite.config.js` sets `root: 'public'`
- One-paragraph summary:
	- Added an explicit `test` section to `vite.config.js` that tells Vitest where to find test files. When Vite's `root` is changed to `public`, Vitest inherits that root and fails to discover tests located in the repository `tests/` folder. The `test.include` option ensures tests under `tests/` are discovered regardless of Vite's `root` setting.
- Line-by-line explanation:
	- `vite.config.js` `test.include`: the glob `tests/**/*.{test,spec}.{ts,tsx,js,jsx}` explicitly points Vitest to the repository `tests/` directory so test discovery works even when the Vite root is different (e.g., `public`).
	- Placing this config in `vite.config.js` keeps test configuration co-located with build/dev config and avoids needing a separate `vitest` block in `package.json`.
- How to run and test locally (commands):

```powershell
npm install
npm test
# or to run vitest directly with verbose output
npx vitest --run
```

- Expected outcome:
	- `npm test` discovers and runs tests under the `tests/` directory (e.g., `tests/money.test.ts`) and exits with code 0 when tests pass.

- Acceptance criteria / Reviewer next steps:
	- Pull the branch and run the commands above.
	- Confirm Vitest no longer reports `RUN .../public` with `No test files found` and instead runs the `tests/` suite.
	- Verify `npm run dev` behavior is unchanged and the app still serves from `http://localhost:5173` with HMR working.

- Suggested follow-up learning items or references:
	- Vitest config docs: https://vitest.dev/config/
	- Vite config docs: https://vitejs.dev/config/

---

Change: Make Vitest include globs resolve from repository root when Vite `root` is `public`
- One-paragraph summary:
	- Updated `vite.config.js` `test.include` to use a repository-root relative glob (`../tests/...`) so Vitest finds test files under the repo `tests/` folder even when Vite's `root` is set to `public`. This avoids Vitest inheriting the Vite dev `root` and searching `public` for tests.
- Line-by-line explanation:
	- `vite.config.js` `test.include`: changed from `tests/**/*...` to `../tests/**/*...` so the glob resolves one directory up from the `public` root into the repository root `tests/` directory.
- How to run and test locally (commands):

```powershell
git checkout -b feature/fix-vitest-include
# apply the change (or pull the branch with the patch)
npm install
npm test
npm run dev
# when vite reports the Local URL (may be 5173 or another port), check:
curl.exe -I http://localhost:5173/   # or use the port shown by vite
```

- Expected outcome:
	- `npm test`: Vitest finds and runs tests from the repository-root `tests/` directory (no “No test files found” due to `public` root).
	- `npm run dev`: Vite serves the app and `curl` returns `HTTP/1.1 200 OK` on the logged port.

- Suggested commit / PR text to pass to the engineer:
	- Title: fix: make Vitest discover tests when Vite root is public
	- Body: Adjust Vitest include globs to resolve from repo root when Vite `root` is public.
	
	Validation steps:
	- `git checkout -b feature/fix-vitest-include`
	- `npm install`
	- `npm test` (expect tests to run)
	- `npm run dev` and confirm the dev server responds with 200 OK at the logged port

---

8) Change: Enable `rusqlite` `bundled` feature in Cargo.toml
- One-paragraph summary:
	- Updated `src-tauri/Cargo.toml` to set `rusqlite = { version = "^0.29", features = ["bundled"] }`. This instructs `rusqlite` to build and link a bundled SQLite library at compile time, avoiding platform-specific linking problems when a system SQLite dev library is not present.
- Line-by-line explanation:
	- `src-tauri/Cargo.toml`: under `[dependencies]`, replaced the plain `rusqlite = "^0.29"` with a table including `features = ["bundled"]` so Cargo builds the bundled SQLite C sources as part of the crate build.
- How to run and test locally (commands):

```bash
cd src-tauri
cargo clean
cargo test --verbose 2>&1 | Out-File -FilePath '..\\cargo-test.log' -Encoding utf8
```

- Suggested follow-up learning items:
	- Read `rusqlite` docs about the `bundled` feature and trade-offs (build time vs system library reliance).
	- For production, evaluate whether bundling SQLite or relying on a system-provided SQLite is preferable for security/packaging.
- Implementation TODOs for reviewer / next steps:
	- Run the test commands and attach `../cargo-test.log` for verification.

7) Change: Enable Tauri allowlist to match `api-all` feature
- One-paragraph summary:
	- Updated `src-tauri/tauri.conf.json` to include an `allowlist` with `"all": true`. This aligns the runtime config with the Rust crate feature `api-all` (used in `Cargo.toml`) and prevents tauri-build from failing due to mismatched allowlist settings during compile/test.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json`: under the existing `tauri` object, added `"allowlist": { "all": true }`. This setting enables all Tauri APIs from the configuration side so the build-time codegen and runtime features are consistent.
- How to run and test locally (commands):

```bash
cd src-tauri
cargo clean
cargo test --verbose 2>&1 | Out-File -FilePath '..\\cargo-test.log' -Encoding utf8
``` 

- Suggested follow-up learning items:
	- Review Tauri's `tauri.conf.json` allowlist docs and security implications of enabling `all` APIs.
	- Consider restricting the allowlist to only needed APIs before production packaging.
- Implementation TODOs for reviewer / next steps:
	- Run the test commands on a Windows dev machine and attach `../cargo-test.log`.
	- If other build errors surface (MSVC/linker), ensure the Windows native toolchain is installed.

13) Change: Add npm `tauri` script and `@tauri-apps/cli` devDependency
- One-paragraph summary:
	- Added `tauri` and `tauri:build` npm scripts to the repository root `package.json` so reviewers and contributors can run the Tauri dev flow from the repo root using `npm run tauri` and `npm run tauri:build`. Also added `@tauri-apps/cli` as a devDependency to make the Tauri CLI available locally for consistent developer experience.
- Line-by-line explanation:
	- `package.json` `scripts.tauri`: runs `tauri dev` which starts the Tauri dev process (bundles frontend with Vite and runs the Rust backend host).
	- `package.json` `scripts["tauri:build"]`: runs `tauri build` to create a production package.
	- `package.json` `devDependencies.@tauri-apps/cli`: developer tool providing the `tauri` binary; installing as a devDependency avoids requiring a global install.
- How to run and test locally (commands):

```bash
npm ci
npm test -- --run
npm run build
npm run tauri   # starts Tauri dev (frontend+backend)
node scripts/tauri-allowlist-checker.js
```

- Suggested follow-up learning items:
	- If `npm run tauri` still fails, run `npx @tauri-apps/cli dev` to use the local CLI binary.
	- Verify `tauri.conf.json` allowlist is minimal and update `src-tauri/Cargo.toml` features if needed to match the runtime allowlist.

- Implementation TODOs (for engineers / reviewers):
	- Run the commands above and attach dev logs to the PR if errors occur.
	- If CI or contributor machines prefer a global CLI, document it in CONTRIBUTING instead of committing the devDependency.
	- Clean up any Rust warnings (unused imports) surfaced during `cargo test` in `src-tauri/src/db.rs` and `src-tauri/src/main.rs`.

10) Change: Map frontend `tauri` module label to `invoke` in checker report
- One-paragraph summary:
	- Improved the allowlist checker (`scripts/tauri-allowlist-checker.js`) to emit a mapped module list that translates the frontend module label `tauri` (produced when code imports `@tauri-apps/api` without a specific submodule) to the clearer reviewer-facing key `invoke`. This makes `allowlist-report.json` more actionable when selecting minimal `tauri.conf.json` allowlist keys.
- Line-by-line explanation:
	- In `scripts/tauri-allowlist-checker.js` the script already detects `@tauri-apps/api/*` imports and collects the module names in `frontendModules`.
	- The change adds a small `moduleLabelMap = { 'tauri': 'invoke' }` and computes `frontendModulesMapped` by replacing known ambiguous labels with reviewer-friendly keys.
	- The report now includes both `frontendModules` (raw detections) and `frontendModulesMapped` (mapped reviewer keys) so maintainers can see raw context and the suggested allowlist mapping.
- How to run and test locally (commands):

```bash
node scripts/tauri-allowlist-checker.js
jq '.frontendModulesMapped' allowlist-report.json
```

Expect `"invoke"` to appear in `frontendModulesMapped` when the frontend uses `@tauri-apps/api` or `invoke(...)`.
- Suggested follow-up learning items:
	- Extend `moduleLabelMap` with additional mappings as reviewers prefer (e.g., `fs` -> `fs`, `dialog` -> `dialog`).
	- Add small unit tests for the checker script (e.g., sample input files, expected JSON output) to prevent regressions.
- Implementation TODOs (for engineers / PRs):
	- Include the mapping rationale in the PR body and mention any additional allowlist keys added to `src-tauri/tauri.conf.json`.
	- If reviewers prefer different labels, update `moduleLabelMap` accordingly and document the change in this file.

11) Change: Remove `api-all` feature from `tauri` in `src-tauri/Cargo.toml`
- One-paragraph summary:
	- Replaced the `tauri` dependency that enabled the broad `api-all` feature with a minimal dependency declaration (`tauri = { version = "^1.2" }`). This prevents the Tauri build script from failing when `tauri.conf.json` intentionally defines a minimal allowlist and avoids expanding the runtime API surface unintentionally.
- Line-by-line explanation:
	- `src-tauri/Cargo.toml` dependency line: removing `features = ["api-all"]` stops Cargo from enabling all Tauri API features at compile time. The repo's allowlist enforces minimal runtime permissions; keeping feature flags narrow ensures the build script's feature-to-allowlist validation passes.
- How to run and test locally (commands):

```powershell
cd src-tauri
cargo clean
cargo test --verbose
cd ..
node scripts/tauri-allowlist-checker.js
``` 

- Suggested follow-up learning items:
	- Read Tauri feature flags documentation to understand mapping between crate features and runtime allowlist keys.
	- If new frontend APIs are added, update `src-tauri/tauri.conf.json` accordingly and re-run the checker.
- Implementation TODOs for reviewer / next steps:
	- Verify `cargo test` completes on Windows CI and that `allowlist-report.json` shows `allowAll: false`.
	- If additional Tauri APIs are truly required, prefer listing explicit features (e.g., `api-invoke`) and mirror those in `tauri.conf.json` with justification in the PR description.

---

Change: Remove UTF-8 BOM from `src-tauri/tauri.conf.json`
- One-paragraph summary:
	- The Tauri build script failed parsing `src-tauri/tauri.conf.json` due to a leading UTF-8 BOM (bytes EF BB BF). I removed the BOM by re-saving the file as UTF-8 without BOM so `tauri-build` can parse the JSON and `cargo test` can proceed.
- Line-by-line explanation:
	- `src-tauri/tauri.conf.json`: the file contained a leading BOM which some JSON parsers (including the build helper) treat as invalid input. Rewriting the file without the BOM preserves the JSON content while ensuring the bytes start with `{`.
- How to validate locally:
	1. Confirm the file no longer contains the BOM (PowerShell):

	```powershell
	Get-Content -Path E:\Documents\Coding_Development\ClinchrFT\src-tauri\tauri.conf.json -Encoding Byte | Select-Object -First 3 | ForEach-Object { "{0:X2}" -f $_ }
	# Expect output starting with 7B (the '{' character), not EF BB BF
	```

	2. Re-run the previous failing command and confirm build script can read the file:

	```powershell
	cd src-tauri
	cargo clean
	cargo test -v
	```

- Suggested follow-ups:
	- Add a pre-commit hook or editor config to ensure JSON files are saved as UTF-8 without BOM (particularly on Windows editors that may default to BOM-enabled saves).
	- If CI re-writes files, ensure an early validation step checks `tauri.conf.json` validity (e.g., `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8'))"`).

---

Follow-up: Automated validation and pre-commit guidance

- One-paragraph summary:
	- Added a repository-level validation script `scripts/validate-tauri-conf.js` and an npm script `validate:tauri-conf` to detect leading UTF-8 BOMs and JSON parse errors early (locally or in CI).

- How to run locally:

```powershell
npm run validate:tauri-conf
```

- Pre-commit / CI suggestions:

	- CI: add `npm run validate:tauri-conf` as an early step in your CI workflow to fail fast on malformed `tauri.conf.json`.
	- Git hooks: add a pre-commit hook that runs `npm run validate:tauri-conf` (via Husky or a simple script). If you prefer not to add Husky, provide a `.githooks/pre-commit` script and set `git config core.hooksPath .githooks` for contributors.
	- Editor guidance: recommend workspace setting for VS Code:

	```
	"files.encoding": "utf8"
	```

	- If any build or CI step rewrites `tauri.conf.json`, ensure it writes UTF-8 without BOM (Node: `fs.writeFileSync(path, content, { encoding: 'utf8' })`).

---

- Reviewer next steps:
	- Re-run the `cargo test` that previously failed and confirm the JSON parse error is resolved.
	- If tests still fail, follow the earlier diagnostic steps in the ticket (check `TAURI_CONFIG` env var, file permissions, and any build-time modifications).

---

Change: Add Tauri allowlist policy text, CI check, and PR checklist item
- One-paragraph summary:
	- Added a short policy paragraph to the engineer agent prompt, ensured the PR template includes a tauri allowlist checkbox, and verified the CI workflow runs the `tauri-allowlist-checker.js`. These small repository hygiene changes help enforce a minimal Tauri allowlist and make allowlist decisions visible in PRs.
- Line-by-line explanation:
	- `.github/agents/engineer.agent.md`: inserted the explicit allowlist policy paragraph so automated engineer agents and contributors follow the minimal-privilege guidance when editing `src-tauri/tauri.conf.json`.
	- `.github/PULL_REQUEST_TEMPLATE.md`: corrected the checklist formatting and ensured a line exists prompting authors to document allowlist changes and justifications.
	- `.github/workflows/ci.yml`: the workflow already runs `node scripts/tauri-allowlist-checker.js`; reviewers should confirm this step appears in CI runs and fails on disallowed config (e.g., `allowlist.all: true`).
- How to run and test locally (commands):

```powershell
# Validate the repository-level allowlist check runs locally
node scripts/tauri-allowlist-checker.js

# Run CI-equivalent local checks (frontend + Rust tests)
npm ci
npx vitest run
cd src-tauri && cargo test --verbose
```
- Suggested follow-up learning items or references:
	- Read Tauri allowlist docs and the mapping between frontend API usage and `tauri.conf.json` keys.
	- Extend `scripts/tauri-allowlist-checker.js` to include small sample-based unit tests.
- Reviewer handoff / next steps:
	- Confirm CI runs and that the allowlist checker step fails when `src-tauri/tauri.conf.json` contains `allowlist.all: true`.
	- When adding native APIs, include `allowlist-report.json` output and a mapping explanation in the PR body.

**Reviewer Handoff**

- **PR / Commit:** include the edits to `src-tauri/src/db.rs` (update_transaction refactor), `src-tauri/src/commands.rs`, `src-tauri/src/main.rs`, and this `docs/learning-artifacts.md` entry. Provide one-paragraph summary + annotated notes in the PR body.
- **CI verification:** run the full CI pipeline (Windows and other runners). Ensure `cargo test` and `npm test` pass and `scripts/tauri-allowlist-checker.js` passes.
- **Runtime check:** exercise `update_transaction` via the app or `invoke` with representative data; run DB-related integration tests.
- **Code audit:** inspect `src-tauri/src/db.rs` for any temporary-borrow patterns; the `update_transaction` function was refactored to use an explicit parameter index and owned `Value` instances.
- **Fix warnings:** removed unused imports in `src-tauri/src/commands.rs` and `src-tauri/src/main.rs`.
- **SQLite config:** confirm `rusqlite` is built with the desired linking strategy on CI (e.g., `bundled` feature) and adjust runners to install the native sqlite dev libs if not using `bundled`.
- **Optional improvement:** add an integration test to cover `update_transaction` through the Tauri command layer to prevent regressions.
- **Commands to run locally / in CI:**

```powershell
cd src-tauri
cargo clean
cargo test -v
```

and for frontend/tests:

```bash
npm ci
npm test
```

---

Follow the project's normal PR flow: open `feature/transactions-crud` branch, push changes, and request `@reviewer` to run CI and verify runtime behavior.

	---

	12) Change: Convert `tests/checker.test.js` to use ESM `import`
	- One-paragraph summary:
		- Replaced CommonJS `require()` usage in `tests/checker.test.js` with ESM `import` statements so Vitest can be imported and executed as an ES module. This avoids the runtime error `Vitest cannot be imported in a CommonJS module using require()` and allows the test runner to execute the checker test alongside existing TypeScript/ESM tests.

	- Line-by-line explanation:
		- `import fs from 'fs'`, `import path from 'path'`, `import os from 'os'`, `import cp from 'child_process'`: standard Node ESM imports for filesystem and child process helpers.
		- `import { test, expect } from 'vitest'`: imports Vitest's test APIs as ESM so Vitest is not required inside a CommonJS module.
		- Test body: creates a temporary repository layout under the OS temp directory, writes a minimal React `App.tsx` that calls `invoke(...)`, writes a sample `commands.rs` containing `#[tauri::command]` functions, writes a minimal `tauri.conf.json`, runs the repository checker script with `CLINCHRFT_REPO_ROOT` set to the temp folder, and asserts the produced `allowlist-report.json` contains the expected mapping and command names.

	- How to run and test locally (commands):

	```bash
	cd /d E:\Documents\Coding_Development\ClinchrFT
	npm install
	npm test
	```

	If your environment still treats `.js` files as CommonJS, run the single test directly with Vitest explicitly as a module, or rename to `.test.mjs`. Example to run only the checker test:

	```bash
	npx vitest run tests/checker.test.js
	```

	- Suggested follow-up learning items or references:
		- Read Vitest docs about ESM vs CommonJS module resolution and how test files are treated.
		- Consider adding a linter rule or a pre-commit hook to enforce ESM-style test files to avoid similar breakage.

	- Implementation TODOs / notes for reviewer / next steps:
		- Reviewer: run `npm test` in CI to confirm both `tests/money.test.ts` and `tests/checker.test.js` pass in your environment.
		- If CI agents treat `.js` as CommonJS, consider adding `"type": "module"` to `package.json` or renaming test to `checker.test.mjs`.
		- Confirm no other test files rely on CommonJS `require()`; update them to ESM if needed.

14) Change: Align Vite and `@vitejs/plugin-react` versions to resolve install failure

---

Change: Upgrade Tauri Rust crates to v2 to match CLI/NPM v2

- One-paragraph summary:
	- Updated `src-tauri/Cargo.toml` to use Tauri crates v2 (`tauri = "2"` and `tauri-build = "2"`) so the Rust side aligns with the installed `@tauri-apps/cli` / `@tauri-apps/api` v2 schema. This resolves the build-time schema validation error where `tauri-build` v1 rejected v2-shaped `tauri.conf.json` (unknown top-level `app` field).
- Line-by-line explanation:
	- `src-tauri/Cargo.toml` dependency lines: changed `tauri` from `^1.2` to `2` and `tauri-build` from `^1.2` to `2`. This instructs Cargo to fetch the Tauri v2 crates which understand the v2 `tauri.conf.json` shape.
	- No source code edits were made in this commit; Rust API surface changes may still be required depending on usage of Tauri APIs in `src-tauri/src/*.rs`.
- How to run and test locally (commands):

```powershell
cd src-tauri
cargo update
cd ..
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
npm run tauri
```

- Suggested follow-up learning items or references:
	- Read Tauri v2 migration notes and changelog for Rust API changes: https://tauri.app/v2/guides/migration
	- Review `src-tauri/src/*.rs` for any deprecated v1 APIs (e.g., `tauri::Builder` or feature flags) and adjust per v2 docs.
- Implementation TODOs / reviewer handoff (next steps for `@reviewer`):
	1. Run the commands above on a Windows machine with Rust/MSVC installed.
	2. If `cargo` compile errors occur, inspect `src-tauri/src/*.rs` and adapt code to Tauri v2 API (likely small changes around builder/context usage or feature flags).
	3. Re-run `npm run tauri` and attach the new `tauri-info.log` and `allowlist-report.json` if successful.
	4. If Rust API changes are non-trivial, open a follow-up `feature/tauri-v2` branch and document the necessary code edits in the PR body with annotated explanations.

---

**Reviewer Handoff**

- Implemented change: `src-tauri/Cargo.toml` updated to Tauri v2 crates.
- Assumptions: The frontend CLI & `@tauri-apps/api` are already v2; no Rust source edits were applied in this patch.
- Areas to verify during review:
  - Compile the Rust project and fix any v2 API breakages in `src-tauri/src/`.
  - Ensure `tauri.conf.json` remains valid for v2 and the allowlist checker passes.
  - Run full acceptance checks: `npm run dev` (frontend) and `npm run tauri` (full desktop dev).

- Commands for reviewer to run:

```powershell
cd src-tauri
cargo update
cargo clean
cargo build --verbose
cd ..
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
npm run tauri
```

If you'd like, I can continue by running the minimal code changes required in `src-tauri/src/*.rs` to compile under Tauri v2 — tell me and I'll proceed with a focused patch and include the required teaching artifacts.
- One-paragraph summary:
	- Updated `package.json` devDependency `@vitejs/plugin-react` from `^4.0.0` to `^5.0.0` so the plugin's peer dependency range includes `vite@8.x`. This resolves an `ERESOLVE` peer dependency error that blocked `npm ci` and prevented running frontend tests and Tauri dev.
- Line-by-line explanation:
	- `package.json` `devDependencies.@vitejs/plugin-react`: bumped to `^5.0.0` which declares compatibility with Vite 8; no other dependency changes were made.
	- No changes were required in Vite config or source files because the plugin API between v4 and v5 is backward-compatible for this project.
- How to run and test locally (commands):

```bash
cd /d E:\Documents\Coding_Development\ClinchrFT
npm ci
npm test -- --run
npm run build
npm run tauri    # or: npx @tauri-apps/cli dev
node scripts/tauri-allowlist-checker.js
cd src-tauri && cargo test
```
- Suggested follow-up learning items:
	- Review npm peer dependency resolution behavior and the meaning of `ERESOLVE` vs `--legacy-peer-deps`.
	- Read the `@vitejs/plugin-react` release notes for v5 to see any migration notes if the project adopts advanced Vite plugin features.
- Implementation TODOs (for reviewers / next steps):
	- Run the commands above and confirm `npm ci` succeeds without `--legacy-peer-deps`.
	- If CI pins older Vite versions, ensure the CI Node cache is cleared or update any lockfiles accordingly.

---

Change: Backup and replace `src-tauri/tauri.conf.json` with a minimal Tauri v2 config

- One-paragraph summary:
	- Backed up the existing `src-tauri/tauri.conf.json` to `src-tauri/tauri.conf.json.bak` and replaced it with a minimal Tauri v2 configuration that sets a development `devPath`, `distDir`, disables global allowlist (`all: false`), and adds a minimal `bundle.active` flag. Captured `npm run tauri` and `npx tauri info --verbose` outputs to `tauri-dev.log` and `tauri-info.log` for debugging.

- Line-by-line explanation / mapping:
	- `build.devPath`: points to the Vite dev server used during development (`http://localhost:5173`).
	- `build.distDir`: the production dist output relative to `src-tauri`.
	- `tauri.bundle.active`: marks bundling as active for developer clarity.
	- `tauri.allowlist.all: false`: ensures the runtime allowlist is minimal; add only required keys.
	- `tauri.security.csp: null`: left explicit as null per the minimal template provided by reviewers.

- How to run and validate locally (commands):

```powershell
cd 'e:\\Documents\\Coding_Development\\ClinchrFT'
# run Tauri dev and capture logs
npm run tauri > tauri-dev.log 2>&1
# capture Tauri environment info
npx tauri info --verbose > tauri-info.log 2>&1
```

- What was changed (files):
	- `src-tauri/tauri.conf.json` — replaced with minimal config
	- `src-tauri/tauri.conf.json.bak` — backup of the previous config (overwritten/updated)
	- `tauri-dev.log`, `tauri-info.log` — generated logs in the repo root

- Reviewer next steps / handoff to `@reviewer`:
	1. Inspect `src-tauri/tauri.conf.json` and confirm the minimal allowlist meets expected front-end API needs.
	2. Open and attach `tauri-dev.log` and `tauri-info.log` to the PR if `npm run tauri` still errors.
	3. If additional allowlist keys are required, run `node scripts/tauri-allowlist-checker.js` and update `src-tauri/tauri.conf.json` accordingly, documenting the mapping in the PR body.

	- If any runtime plugin incompatibilities surface, revert to a compatible Vite version or adapt the code per plugin migration notes.

---

Change: Transactions CRUD implementation (summary)
- One-paragraph summary:
	- Implemented backend DB helpers and Tauri commands for transactions CRUD, wired frontend services and simple UI components (`TransactionList`, `TransactionForm`) to call the new commands. This enables create/read/update/delete flows persisted to a local SQLite DB under the application data folder.

- Line-by-line explanation / annotated notes:
	- `src-tauri/src/db.rs`: added `open_db`, `run_migrations`, `get_transactions`, `insert_transaction`, `update_transaction`, `delete_transaction`. Introduced `TransactionRow`, `CreateTransaction`, and `UpdateTransaction` types with `serde(rename_all = "camelCase")` so JSON keys match the renderer. Unit tests added that exercise a full CRUD roundtrip in an in-memory DB.
	- `src-tauri/src/commands.rs`: added Tauri commands `create_transaction`, `update_transaction`, `delete_transaction`, and updated `get_transactions` to call DB helpers. Commands return user-friendly error messages and avoid leaking internal paths.
	- `src-tauri/src/main.rs`: registered the new commands in `invoke_handler` so the frontend can call them.
	- `src/services/tauri-api.ts`: added `createTransaction`, `updateTransaction`, and `deleteTransaction` wrappers around `invoke`.
	- `src/pages/Transactions.tsx`: replaced mock data with real fetch from `getTransactions`, added create/edit modal flow that uses `TransactionForm` and `TransactionList` components.
	- `src/components/TransactionList.tsx`: new presentational table with Edit/Delete actions.
	- `src/components/TransactionForm.tsx`: new form for create/edit flows; uses `dollarsToCents`/`centsToDollars` from `src/lib/money.ts`.
	- `src/types/index.ts`: aligned `categoryId` to be optional to match backend representation.

- How to run and test locally (commands)

```bash
npm install
npm run dev      # frontend only
# in a separate terminal (requires Rust + Tauri toolchain):
cd src-tauri
cargo test       # runs Rust unit tests
cargo tauri dev  # runs Tauri dev with backend + frontend
```

- Suggested follow-ups / learning items:
	- Add accounts/categories CRUD and present display names in the transactions list.
	- Add validation and nicer UX for the TransactionForm (selects for accounts/categories).
	- Implement a migration runner that reads `db/migrations/*.sql` files instead of embedding DDL.

- Implementation TODOs for reviewer / next steps:
	- Run `cargo test` and `npm run dev` and verify create/edit/delete flows persist to `%APPDATA%/ClinchrFT/clinchrft.db`.

---

Change: Add DB-path override and command-layer roundtrip test
- One-paragraph summary:
	- Added an environment-variable override for the application DB path (`CLINCHRFT_DB_PATH`) in `src-tauri/src/commands.rs` and a unit test that exercises the Tauri command wrappers (`create_transaction`, `update_transaction`, `delete_transaction`, `get_transactions`) end-to-end against a temporary DB file. This provides a lightweight integration check that the command layer wiring and DB helpers cooperate and makes CI/local tests avoid touching a user's real AppData path.

- Line-by-line explanation:
	- `src-tauri/src/commands.rs::db_path()`:
		- Checks `CLINCHRFT_DB_PATH` env var and uses it if set; otherwise falls back to the existing `%APPDATA%` location. This allows tests to redirect DB location to a temp file.
		- Keeps the existing behavior for normal runs so the app still stores `clinchrft.db` under the application data folder.
	- `#[cfg(test)] mod tests` (in `commands.rs`):
		- Uses `tempfile::NamedTempFile` to create a temp path, sets the env var to that path, then calls the command wrappers directly:
			- `create_transaction(...)` to insert a row.
			- `update_transaction(...)` to modify the inserted row and assert the changed value.
			- `delete_transaction(...)` and `get_transactions()` to assert the row was removed.

- How to run and test locally (commands):

```powershell
cd src-tauri
cargo clean
cargo test -v
```


- Suggested follow-up learning items or references:
	- Add a dedicated integration test that spins up a minimal Tauri `Builder` and invokes commands via the real IPC layer for higher-fidelity coverage.
	- Consider using a test-only feature flag that isolates Tauri-specific tests from unit tests when CI runners lack native GUI dependencies.

- Implementation TODOs / next steps for reviewer:
	- Run `cargo test` on Windows and one non-Windows runner in CI to confirm rusqlite linking works (the repo uses the `bundled` feature to avoid system sqlite dependency).
	- If you want IPC-level integration tests, request that the `@planner` create a task specifying test harness requirements (App builder, headless mode, and any allowlist adjustments).

Reviewer handoff:
- What I implemented: `CLINCHRFT_DB_PATH` override and a roundtrip test in `src-tauri/src/commands.rs`.
- Assumptions: tests may set `CLINCHRFT_DB_PATH` to avoid writing to `%APPDATA%`; the existing `rusqlite` bundled feature is used for predictable CI linking.
- Areas for attention in review: ensure CI runners permit building `rusqlite` with the `bundled` feature and that any new test artifacts are acceptable in your CI policy.

Next steps for you / `@reviewer`:
- Run `cd src-tauri && cargo test -v` on your CI runners (Windows + non-Windows) and attach logs if failures occur.
- Optionally ask `@planner` to define an IPC-level integration test task if you want the test to exercise `invoke` through Tauri's runtime instead of calling the command functions directly.

	- Review Tauri allowlist and ensure `tauri.conf.json` contains only the necessary keys for `invoke` usage.
	- Confirm that JSON field naming stays consistent across frontend and backend; tests cover this for basic cases.

---

Change: Fix borrow-of-temporary in `src-tauri/src/db.rs` (E0716)
- One-paragraph summary:
	- Resolved a compile-time borrow error where the code pushed a reference to a temporary `rusqlite::types::Value` (created inline) into a vector of references. The fix pushes owned `Value` instances into the parameter vector and consumes it when executing the prepared statement, avoiding dangling references and ensuring `cargo test` can compile.
- Line-by-line explanation:
	- In `update_transaction`, the original code collected `params_vec.iter()` into a `Vec<&Value>` and then attempted to push `&Value::from(id.to_string())` (a temporary). That temporary was dropped at statement end, leaving a dangling reference.
	- The change replaces the reference-based approach with owned values: `params_vec.push(Value::from(id.to_string()))` and then passes the iterator `params_vec.into_iter()` to `rusqlite::params_from_iter`, which consumes the owned values.
	- This approach is simpler and safer: it avoids lifetime gymnastics and leverages `rusqlite`'s ability to accept owned `Value` items as parameters.
- How to run and test locally (commands):

```powershell
cd src-tauri
cargo clean
cargo test -v
``` 

- Suggested follow-up learning items or references:
	- Read Rust ownership/lifetimes primer, focusing on why referencing temporaries causes E0716.
	- Review `rusqlite::params_from_iter` and `rusqlite::types::Value` implementations of `ToSql`.
	- Consider adding unit tests around SQL parameter construction paths to catch similar regressions.
- Implementation TODOs for reviewer / next steps:
	- Run the `cargo test` command above on Windows/CI to confirm the compilation error is resolved.
	- Inspect `src-tauri/src/db.rs` for any other instances of pushing references to temporaries and fix similarly.
	- If desired, suggest a refactor to centralize parameter building into a helper function to reduce duplication and enhance testability.

---
Change: Fix Vite dev root and enable React plugin
- One-paragraph summary:
	- Updated `vite.config.js` to set `root: 'public'` (serve `public/index.html` in dev) and enabled `@vitejs/plugin-react` so `.tsx` files are transformed and HMR works. This prevents the Pre-transform error and 404 for `main.tsx` in the Tauri dev window.
- Line-by-line explanation:
	- `vite.config.js`: import `react` from `@vitejs/plugin-react`, add `plugins: [react()]`, preserve `root: 'public'`, and keep the `server.watch.ignored` glob for `src-tauri/target`.
	- `package.json`: ensure `@vitejs/plugin-react` is present in `devDependencies`. If missing, run `npm install -D @vitejs/plugin-react`.
- How to run and test locally (commands):
```powershell
cd "e:\\Documents\\Coding_Development\\ClinchrFT"
node ./scripts/validate-tauri-conf.js
node ./scripts/tauri-allowlist-checker.js
npm install    # ensure deps installed; if plugin missing: npm install -D @vitejs/plugin-react
npx tauri dev
# or frontend-only:
npm run dev
curl -I http://localhost:5173/
```
- Expected outcome:
	- Vite serves `index.html` from `public/` and transforms `main.tsx` without Pre-transform errors.
	- `curl -I http://localhost:5173/` returns `HTTP/1.1 200 OK`.
	- Tauri window loads the React app (no 404) and logs show no pre-transform error.
- Suggested follow-up learning items or references:
	- Vite docs: dev `root` and plugin system, `@vitejs/plugin-react` HMR behavior.
- Implementation TODOs / reviewer handoff:
	1. Create branch `feature/fix-vite-dev-root-react-plugin`.
	2. Commit updated `vite.config.js` and `package.json` changes.
	3. Run `npm install` (or `npm install -D @vitejs/plugin-react` if needed) and run the validation scripts above.
	4. Attach `tauri-dev.log` showing successful 200/app load to the PR.
	5. Ask `@reviewer` to run the acceptance checklist and CI checks.

