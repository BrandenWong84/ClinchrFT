# Dev Mock (localStorage) Guide

ClinchrFT includes a lightweight frontend mock that runs when the Tauri runtime is not present. This enables `npm run dev` iteration without requiring the Rust backend.

Storage key
- The mock persists a JSON object under `localStorage` key: `clinchrft:mock:db_v1`.

Structure
- The stored JSON has top-level keys: `accounts`, `categories`, `transactions`. Each is an array of objects mirroring the frontend `types` shapes. IDs are strings.

Resetting or seeding
- To reset the mock DB open DevTools Console and run:

```js
localStorage.removeItem('clinchrft:mock:db_v1')
window.location.reload()
```

- To seed minimal data for development run:

```js
localStorage.setItem('clinchrft:mock:db_v1', JSON.stringify({ accounts: [{ id: 'a1', name: 'Cash' }], categories: [], transactions: [] }))
window.location.reload()
```

Notes for tests
- Unit tests may mock the `isTauriAvailable()` check or set up `localStorage` in `tests/setupTests.ts` to ensure deterministic behavior.
