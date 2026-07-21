# CSV Format Specification

This document defines the canonical CSV import/export format used by ClinchrFT. Follow this spec for export semantics and when generating sample CSVs for import.

Header
- The export header row MUST be exactly (order matters):
  - Transaction ID,Date,Account,Category,Memo,Amount

Columns
- Transaction ID: label only. For exports this column contains the transaction primary key (string) when available; during import the field is optional and ignored for new rows.
- Date: ISO 8601 date string in `YYYY-MM-DD` (no time). Example: `2024-12-31`.
- Account: Account name (human-readable). Export uses account name, not `account_id`. During import the preview resolves account names to IDs; unknown names are flagged in preview errors.
- Category: Category name (optional). The importer may accept names or ids depending on implementation; current behavior resolves category names where possible.
- Memo: Free-text field. CSV quoting rules apply for commas/newlines.
- Amount: Decimal dollars with two fractional digits (NOT integer cents). Example: `1.23`, `-15.00`.

Quoting and escaping
- Use RFC4180 style CSV. Fields containing commas, double-quotes, or newlines must be double-quoted and internal quotes doubled. Example: `"He said ""Hello""",123`.

Duplicates and preview logic
- The importer preview compares rows against existing transactions to surface likely duplicates. Duplicate heuristics include matching `date`, `amount` (in cents), `account`, and `memo` similarity. Duplicate detection is a warning; the final apply can still insert if confirmed.

Error handling
- Preview returns per-row `errors: string[]`. If any preview row includes a blocking error (e.g., unknown account and no resolution), the UI prevents Confirm Import until resolved.

Sample files
- See `docs/samples/export-sample.csv` and `docs/samples/import-sample.csv` for examples.
