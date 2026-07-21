# API Contracts — Tauri Commands

This document is the single source-of-truth for Tauri invoke command names, parameter shapes (JS), expected Rust handler parameters, and return shapes. Keep this updated whenever you add or change commands.

Rules
- JS uses camelCase keys when invoking: `invoke('commandName', { myParam: 'value' })`.
- Rust handlers may use snake_case in their function signatures, but use Serde attribute `#[serde(rename_all = "camelCase")]` on structs or explicit `rename` to accept camelCase payloads.
- All command names are lowercase with underscores in Rust; the JS `invoke` name matches the Rust command name string.

Commands

- `preview_import_csv`
  - JS args: `{ csvText: string }`
  - Rust signature: `fn preview_import_csv(csv_text: String) -> Result<Vec<ImportRowPreview>, String>`
  - Return: `[{ index: number, account_id?: String, account_name?: String, category_id?: String, amount_cents: number, memo?: String, date: String, errors: string[], duplicate?: boolean }]`

- `apply_import_csv`
  - JS args: `{ csvText: string }`
  - Rust signature: `fn apply_import_csv(csv_text: String) -> Result<u32, String>` (returns number of rows inserted)

- `export_transactions_csv`
  - JS args: `{ filter?: GetTransactionsFilter, destPath?: string | null }`
  - Rust signature: `fn export_transactions_csv(filter: Option<GetTransactionsFilter>, dest_path: Option<String>) -> Result<String, String>` (returns destination path or written path)

- `export_transactions_csv_data`
  - JS args: `{ filter?: GetTransactionsFilter }`
  - Rust signature: `fn export_transactions_csv_data(filter: Option<GetTransactionsFilter>) -> Result<String, String>` (returns CSV UTF-8 data string)

- `create_backup`
  - JS args: `{}`
  - Rust signature: `fn create_backup() -> Result<String, String>` (returns path to backup file)

- `restore_backup`
  - JS args: `{ backupPath: string }`
  - Rust signature: `fn restore_backup(backup_path: String) -> Result<(), String>`

Types referenced
- `GetTransactionsFilter` (JS)
  - `{ startDate?: string, endDate?: string, accountId?: string, categoryId?: string, limit?: number, offset?: number }`

- `get_transactions`
  - JS args: `{ filter?: GetTransactionsFilter }` or no args
  - Rust signature: `fn get_transactions(filter: Option<GetTransactionsFilter>) -> Result<PaginatedTransactions, String>`
  - Return: `{ items: Transaction[], total: number, limit: number, offset: number }`

- `get_accounts`
  - JS args: `{}`
  - Rust signature: `fn get_accounts() -> Result<Vec<AccountRow>, String>`
  - Return: `[{ id: string, name: string, notes?: string, deleted_at?: Option<String> }]`

- `get_categories`
  - JS args: `{}`
  - Rust signature: `fn get_categories() -> Result<Vec<CategoryRow>, String>`
  - Return: `[{ id: string, name: string, notes?: string, deleted_at?: Option<String> }]`

- `create_account`
  - JS args: `{ name: string, notes?: string }`
  - Rust signature: `fn create_account(name: String, notes: Option<String>) -> Result<AccountRow, String>`
  - Return: `AccountRow`

- `create_transaction`
  - JS args: `{ tx: CreateTransaction }` where `CreateTransaction` is `{ date: string, amount_cents: number, accountId?: string, categoryId?: string, memo?: string }`
  - Rust signature: `fn create_transaction(tx: CreateTransaction) -> Result<TransactionRow, String>`

- `update_transaction`
  - JS args: `{ id: string, tx: UpdateTransaction }` where `UpdateTransaction` is partial fields to update
  - Rust signature: `fn update_transaction(id: String, tx: UpdateTransaction) -> Result<TransactionRow, String>`

- `delete_transaction`
  - JS args: `{ id: string }`
  - Rust signature: `fn delete_transaction(id: String) -> Result<(), String>`

Notes for engineers
- Add new commands to this document before or alongside changes in `src-tauri/src/commands.rs` and `src/services/tauri-api.ts`.
- Include an example invoke call and an example JSON response in the command's section when adding complex shapes.
