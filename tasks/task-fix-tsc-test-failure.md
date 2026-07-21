# Task: Fix TypeScript type-check failure in tests (TS2349)

Owner: @engineer

Summary:
- `npx tsc --noEmit` fails with TS2349 in `tests/transactions-page.test.tsx`: "This expression is not callable. Type 'void' has no call signatures." This blocks CI and prevents `npm test` from passing type-check.

Repository:
- Path: E:\Documents\Coding_Development\ClinchrFT

Failure details:
- Error (observed):
  ../tests/transactions-page.test.tsx:27:5 - error TS2349: This expression is not callable.
  Type 'void' has no call signatures.

  27     localStorage.setItem('clinchrft:lastAccountId', 'stale-id')
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- Failing file: [tests/transactions-page.test.tsx](tests/transactions-page.test.tsx)
- Config: [tsconfig.json](tsconfig.json)

Hypotheses / likely causes:
- Missing/incorrect ambient types for test environment (DOM and Vitest globals) due to `types` override in `tsconfig.json`.
- `lib` may already include `DOM`, but `types` could prevent inclusion of `vitest` or DOM test helpers.
- An ASI (automatic semicolon insertion) or preceding-line parse issue in the test file could cause the compiler to mis-interpret `localStorage.setItem(...)` as a call on `void`.

Immediate suggested fixes (try in order):
1. Reproduce locally:
   - `npx tsc --noEmit --pretty`
   - If still failing, run with trace resolution: `npx tsc --traceResolution --noEmit`
2. Inspect and update `tsconfig.json`:
   - Option A (recommended): add required test globals to `types`, e.g. `"types": ["node", "vitest"]` or add `"vitest/globals"` so vitest and DOM globals are available.
   - Option B: remove the `types` array entirely so default types and devDependency types are included.
   - Ensure `lib` contains `DOM` (it currently does).
3. Inspect `tests/transactions-page.test.tsx` for missing semicolons or trailing JSX/TS lines that could trigger ASI issues.
4. As a temporary workaround, restrict `tsc` includes to `src/**/*` and exclude `tests/**/*` (not recommended long-term).

Minimal repro steps:
1. From repo root: `npx tsc --noEmit` (observe TS2349 error pointing to tests/transactions-page.test.tsx)
2. Inspect `tsconfig.json` and the test file for type resolution and ASI issues.

Acceptance criteria (for reviewer):
- `npx tsc --noEmit` exits with code 0 (no type errors).
- `npm test` completes as expected.
- Runtime verification: app handles stale `clinchrft:lastAccountId` without uncaught FK errors when creating a transaction.

Runtime manual verification steps (to be run by reviewer):
```powershell
# Backup runtime DB
copy "%APPDATA%\ClinchrFT\data\clinchrft.db" "%USERPROFILE%\Desktop\clinchrft.db.bak"

# Start dev
npm run tauri
```
In DevTools console:
```js
localStorage.setItem('clinchrft:lastAccountId','non-existent-id'); location.reload();
```
- Attempt to add a transaction. Expected: no uncaught foreign-key crash; alert shown; accounts refreshed; transaction saved unassigned or repaired.

Notes / suggestions for implementation:
- Prefer fixing `tsconfig.json` to include `vitest` and DOM globals rather than excluding tests from `tsc`.
- If the test file needs minor syntax fixes (missing semicolon), make a minimal patch and run `npx tsc --noEmit` again.

Branching & PR:
- Suggested branch: `feature/fix-default-account-dup` (or `feature/fix-tsc-test-failure`)
- Include tests and update `tsconfig.json` as needed. Add a short changelog entry.

Please pick up this task and implement the fix. After implementing, run `npx tsc --noEmit` locally and report results. When complete, hand off to `@reviewer` for testing and verification.
