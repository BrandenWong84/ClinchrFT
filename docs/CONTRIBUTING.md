**Tauri allowlist policy**

- Keep `src-tauri/tauri.conf.json` minimal. Do not use `allowlist.all: true` in merge commits.
- Before adding Tauri native APIs, run the allowlist checker:

```
node scripts/tauri-allowlist-checker.js
```

- Document any added allowlist keys in the PR description with a mapping to frontend usage and a brief security justification.