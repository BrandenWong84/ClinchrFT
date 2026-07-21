## Summary

Describe the change and why it was needed.

## Checklist

- [ ] I updated `docs/api-contracts.md` when I added or modified any Tauri `invoke` command signatures.
- [ ] I ran the local checks:
  - `npm run check:api-contracts`
  - `node scripts/tauri-allowlist-checker.cjs` (if Tauri APIs or file access changed)
- [ ] I ran tests and type checks:
  - `npx tsc --noEmit`
  - `npm test`
- [ ] I included `allowlist-report.json` in the PR artifacts if Tauri APIs changed.

Provide any additional notes for reviewers below.
<!-- Please describe the change and why it is needed -->

### Summary

### Related issues

- Fixes: #

### Changes
- 

### How to test
- 

### Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CI is passing
 - [ ] tauri allowlist updated & justified (required if Tauri/native APIs added)
