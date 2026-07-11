# Security notes (v1 - no DB encryption)

- Data storage: the SQLite database lives under the user's application data folder (`%APPDATA%/ClinchrFT`).
- No network: the app does not send telemetry or sync data externally.
- Risks: any local user or process with filesystem access can read the DB file in plaintext. Backups stored on external/cloud services can expose data if not protected.

Recommended mitigations

1. Store the DB file under the current user's profile directory and rely on OS file permissions.
2. Advise users to enable a secure OS account (strong password) and full-disk encryption (BitLocker) to protect data at rest.
3. Avoid storing the DB file in cloud-synced folders (OneDrive, Dropbox) unless the user encrypts the file externally.
4. Consider adding an optional master-password-based encryption in a future release.
