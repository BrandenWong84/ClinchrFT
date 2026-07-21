# Tauri Runtime Notes & Dialog Detection

Background
- Different WebView/packaging setups may expose `@tauri-apps/api` with different module shapes. Bundlers may also change how subpath imports resolve at runtime. Centralize detection logic to avoid duplicated probing code.

Recommended helper (frontend)
- Create `src/services/tauri-helpers.ts` exposing simple utilities:
  - `async detectTauriDialog(): Promise<{ dialog?: any, info?: any }>` — probes `@tauri-apps/api` root and subpath shapes and returns a `dialog` object when found along with `info` for debugging.
  - `async invokeSafely(command: string, payload?: any)` — wraps dynamic `import('@tauri-apps/api/core')` and calls `core.invoke(...)`, normalizing errors.

Best practices
- Prefer browser `showSaveFilePicker` during user-activation (click handler) as a first attempt; then fall back to Tauri `dialog.save` if available and the browser picker isn't used or supported.
- Keep detection code in one place (`tauri-helpers.ts`) so tests can stub it and the `Show debug` checkbox can render the helper's `info` output.

Troubleshooting
- If you see `Failed to resolve module specifier '@tauri-apps/api/dialog'`, the runtime doesn't expose the subpath. Use `detectTauriDialog()` to capture the actual exports and add that JSON to PR notes.
