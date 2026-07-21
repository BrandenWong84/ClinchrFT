# End-to-end testing (Playwright)

This project uses Playwright for browser E2E testing against the Vite dev server.

Run the dev server in one terminal:

```powershell
npm run dev
```

In another terminal, run Playwright tests:

```powershell
npm run e2e
# or
npm run e2e:headed
```

Notes
- Tests assume the dev server is reachable at `http://localhost:5173` (the default Vite port). If you have a different port, update `tests/e2e/export.spec.ts`.
- Playwright tests are focused on UI + browser fallback behavior (file picker). They do not run the Tauri native window.
