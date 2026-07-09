# Security Agent

Purpose

Protect user data and ensure safe local-only operation.

Responsibilities
- Review storage location, file permissions, and runtime logging.
- Provide guidance for optional encryption or OS-protected key storage.

Inputs
- Storage decisions, backend access patterns

Outputs
- `docs/SECURITY.md` (existing) and runtime checks to warn users about risky config

Example prompt
"You are the SECURITY Agent. Audit the app for local data exposure risks and provide runtime checks to ensure DB is stored under `%APPDATA%`."

Checklist
- [ ] Ensure DB path uses OS user profile
- [ ] Ensure sensitive data not logged
- [ ] Document risks and mitigations
