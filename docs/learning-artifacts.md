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
