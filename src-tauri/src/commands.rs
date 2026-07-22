use tauri::command;
use std::path::PathBuf;


use crate::db::{open_db, CreateTransaction, UpdateTransaction, TransactionRow, AccountRow, CategoryRow, GetTransactionsFilter, PaginatedTransactions};
use serde::Serialize;
use csv;
use std::fs;

fn db_path() -> PathBuf {
    // Allow tests or CI to override the DB path by setting CLINCHRFT_DB_PATH.
    if let Some(p) = std::env::var_os("CLINCHRFT_DB_PATH") {
        return PathBuf::from(p);
    }

    

    // Developer convenience: allow repo-local DB when explicitly requested.
    if std::env::var_os("CLINCHRFT_USE_REPO_DB").is_some() {
        // Prefer placing the repo-local DB at the repo root `./data/clinchrft.db` so that
        // it does not live under `src-tauri/` (which is watched by the Tauri/Cargo dev watcher
        // and can trigger rebuilds when the DB file changes).
        let mut dir = std::env::current_dir().unwrap_or_else(|_| std::env::temp_dir());
        // If running with cwd inside `src-tauri`, step up to parent (repo root)
        if dir.file_name().map(|s| s == "src-tauri").unwrap_or(false) {
            if let Some(parent) = dir.parent() {
                dir = parent.to_path_buf();
            }
        }
        let data_dir = dir.join("data");
        std::fs::create_dir_all(&data_dir).ok();
        return data_dir.join("clinchrft.db");
    }

    // Production default: use platform-appropriate app data folder.
    let proj_dirs = directories::ProjectDirs::from("com", "example", "ClinchrFT").unwrap();
    let data_dir = proj_dirs.data_dir();
    std::fs::create_dir_all(data_dir).ok();
    data_dir.join("clinchrft.db")
}

#[command]
pub fn get_transactions(filter: Option<GetTransactionsFilter>) -> Result<PaginatedTransactions, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::get_transactions_paginated(&conn, filter).map_err(|e| format!("DB query error: {}", e))
}

#[command]
pub fn create_transaction(tx: CreateTransaction) -> Result<TransactionRow, String> {
    let path = db_path();
    // Log DB path and incoming payload for easier debugging of FK errors in dev.
    println!("create_transaction -> db_path: {}", path.display());
    println!("create_transaction -> account_id: {:?}, category_id: {:?}", tx.account_id, tx.category_id);
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::insert_transaction(&conn, tx).map_err(|e| {
        let s = format!("{}", e);
        if s.contains("FOREIGN KEY constraint failed") || s.contains("constraint failed: FOREIGN KEY") {
            // Map to a clearer error message suitable for UI display
            format!("Foreign key error: invalid account or category id")
        } else {
            format!("DB insert error: {}", s)
        }
    })
}

#[command]
pub fn update_transaction(id: String, tx: UpdateTransaction) -> Result<TransactionRow, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    match crate::db::update_transaction(&conn, &id, tx).map_err(|e| format!("DB update error: {}", e))? {
        Some(row) => Ok(row),
        None => Err("not found".into()),
    }
}

#[command]
pub fn delete_transaction(id: String) -> Result<(), String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::delete_transaction(&conn, &id).map_err(|e| format!("DB delete error: {}", e))
}

#[command]
pub fn get_accounts() -> Result<Vec<AccountRow>, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::get_accounts(&conn).map_err(|e| format!("DB query error: {}", e))
}

#[command]
pub fn create_account(name: String, notes: Option<String>) -> Result<AccountRow, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::insert_account(&conn, &name, notes).map_err(|e| format!("DB insert error: {}", e))
}

#[command]
pub fn get_categories() -> Result<Vec<CategoryRow>, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::get_categories(&conn).map_err(|e| format!("DB query error: {}", e))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DateAggregateRow {
    pub bucket: String,
    pub category_id: Option<String>,
    pub total_amount_cents: i64,
}

#[command]
pub fn get_transactions_aggregate_by_category(filter: Option<GetTransactionsFilter>) -> Result<Vec<crate::db::CategoryAggregate>, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    let f = filter.unwrap_or(GetTransactionsFilter { start_date: None, end_date: None, account_id: None, category_id: None, min_amount_cents: None, max_amount_cents: None, q: None, sort_by: None, sort_dir: None, limit: None, offset: None });
    crate::db::get_transactions_aggregate_by_category(&conn, f.start_date, f.end_date, f.account_id).map_err(|e| format!("DB query error: {}", e))
}

#[command]
pub fn get_transactions_aggregate_by_date(filter: Option<GetTransactionsFilter>, interval: String) -> Result<Vec<DateAggregateRow>, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    // Build SQL to return flattened rows: bucket, category_id, total_amount_cents
    let f = filter.unwrap_or(GetTransactionsFilter { start_date: None, end_date: None, account_id: None, category_id: None, min_amount_cents: None, max_amount_cents: None, q: None, sort_by: None, sort_dir: None, limit: None, offset: None });
    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    if let Some(sd) = f.start_date { where_clauses.push("date >= ?".to_string()); params_vec.push(rusqlite::types::Value::from(sd)); }
    if let Some(ed) = f.end_date { where_clauses.push("date <= ?".to_string()); params_vec.push(rusqlite::types::Value::from(ed)); }
    if let Some(acc) = f.account_id { where_clauses.push("account_id = ?".to_string()); params_vec.push(rusqlite::types::Value::from(acc)); }
    if let Some(cat) = f.category_id { where_clauses.push("category_id = ?".to_string()); params_vec.push(rusqlite::types::Value::from(cat)); }
    let where_sql = if where_clauses.is_empty() { "".to_string() } else { format!("WHERE {}", where_clauses.join(" AND ")) };

    let date_fmt = match interval.as_str() {
        "month" => "%Y-%m",
        "year" => "%Y",
        "week" => "%Y-%W",
        _ => "%Y-%m-%d",
    };

    let sql = format!("SELECT strftime('{}', date) as bucket, category_id, SUM(amount_cents) as total_amount_cents FROM transactions {} GROUP BY bucket, category_id ORDER BY bucket", date_fmt, where_sql);
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("DB prepare error: {}", e))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params_vec.into_iter()), |r| {
            Ok(DateAggregateRow { bucket: r.get(0)?, category_id: r.get(1)?, total_amount_cents: r.get(2)? })
        })
        .map_err(|e| format!("DB query_map error: {}", e))?
        .collect::<Result<Vec<_>, rusqlite::Error>>()
        .map_err(|e| format!("DB map collect error: {}", e))?;
    Ok(rows)
}

#[command]
pub fn get_app_path() -> String {
    let proj_dirs = directories::ProjectDirs::from("com", "example", "ClinchrFT").unwrap();
    proj_dirs.data_dir().to_string_lossy().to_string()
}

#[command]
#[allow(dead_code)]
pub fn show_save_dialog(_default_name: Option<String>) -> Result<Option<String>, String> {
    // removed: previous implementation relied on rfd which caused native link conflicts.
    // Keep this command unimplemented to avoid build issues; prefer JS/browser fallback.
    Err("native save dialog not available".into())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRowPreview {
    pub index: usize,
    pub account_id: Option<String>,
    pub account_name: Option<String>,
    pub category_id: Option<String>,
    pub amount_cents: Option<i64>,
    pub memo: Option<String>,
    pub date: Option<String>,
    pub errors: Vec<String>,
    pub duplicate: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewResult {
    pub rows: Vec<ImportRowPreview>,
    pub good: usize,
    pub errors: usize,
    pub warnings: usize,
}

#[command]
pub fn seed_dev_data() -> Result<String, String> {
    // Inserts sample accounts, categories and transactions into the repo DB.
    // Useful for local/dev only; idempotent for simple re-seeding.
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;

    // Create sample account
    let acc = crate::db::insert_account(&conn, "Dev Account", None).map_err(|e| format!("insert account: {}", e))?;

    // Create sample categories
    let food = crate::db::insert_category(&conn, "Food", None, None).map_err(|e| format!("insert category: {}", e))?;
    let transport = crate::db::insert_category(&conn, "Transport", None, None).map_err(|e| format!("insert category: {}", e))?;
    let groceries = crate::db::insert_category(&conn, "Groceries", None, None).map_err(|e| format!("insert category: {}", e))?;

    // Insert some transactions
    let _ = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc.id.clone()), category_id: Some(food.id.clone()), amount_cents: 12300, memo: Some("Lunch".into()), date: "2026-07-01".into() }).map_err(|e| format!("insert tx: {}", e))?;
    let _ = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc.id.clone()), category_id: Some(transport.id.clone()), amount_cents: 5000, memo: Some("Bus".into()), date: "2026-07-02".into() }).map_err(|e| format!("insert tx: {}", e))?;
    let _ = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc.id.clone()), category_id: Some(groceries.id.clone()), amount_cents: 2500, memo: Some("Groceries".into()), date: "2026-07-03".into() }).map_err(|e| format!("insert tx: {}", e))?;
    let _ = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc.id.clone()), category_id: None, amount_cents: 7000, memo: Some("Misc".into()), date: "2026-07-04".into() }).map_err(|e| format!("insert tx: {}", e))?;

    Ok("seeded".into())
}

fn parse_amount_to_cents(s: &str) -> Result<i64, String> {
    let s = s.trim();
    if s.is_empty() { return Err("empty amount".into()) }
    let negative = s.starts_with('-');
    let s = s.trim_start_matches('+');
    let s = s.trim_start_matches('-');
    if s.contains(',') && !s.contains('.') {
        // ambiguous thousands separator — reject
        return Err("ambiguous decimal/thousands separator".into())
    }
    let parts: Vec<&str> = s.split('.').collect();
    let whole = parts.get(0).ok_or("invalid amount")?;
    let frac = parts.get(1).cloned().unwrap_or("0");
    if parts.len() > 2 { return Err("invalid amount format".into()) }
    let mut frac_norm = String::from(frac);
    while frac_norm.len() < 2 { frac_norm.push('0') }
    if frac_norm.len() > 2 { frac_norm = frac_norm[..2].to_string() }
    let whole_i: i64 = whole.parse().map_err(|_| "invalid whole number in amount".to_string())?;
    let frac_i: i64 = frac_norm.parse().map_err(|_| "invalid fractional part in amount".to_string())?;
    let cents = whole_i.checked_mul(100).and_then(|w| w.checked_add(frac_i)).ok_or("amount overflow".to_string())?;
    Ok(if negative { -cents } else { cents })
}

#[command]
pub fn preview_import_csv(csv_text: String) -> Result<ImportPreviewResult, String> {
    // Parse CSV from provided text and validate rows (no DB writes).
    let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(csv_text.as_bytes());
    let headers = rdr.headers().map_err(|e| format!("CSV header error: {}", e))?.clone();
    let mut rows: Vec<ImportRowPreview> = Vec::new();

    // fetch existing transactions to detect duplicates
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    let existing = crate::db::get_transactions(&conn).map_err(|e| format!("DB query error: {}", e))?;
    // fetch accounts for name resolution
    let accounts = crate::db::get_accounts(&conn).map_err(|e| format!("DB query error: {}", e))?;
    let name_to_id: std::collections::HashMap<String, String> = accounts.into_iter().map(|a| (a.name.clone(), a.id)).collect();

    for (i, result) in rdr.records().enumerate() {
        let mut errors: Vec<String> = Vec::new();
        let record = result.map_err(|e| format!("CSV parse error: {}", e))?;
        let mut account_id = None;
        let mut account_name = None;
        let mut category_id = None;
        let mut memo = None;
        let mut date = None;
        let mut amount_cents = None;

        for (h, v) in headers.iter().zip(record.iter()) {
            match h.to_lowercase().as_str() {
                "account" | "account_id" | "accountid" => { if !v.is_empty() { account_name = Some(v.to_string()); if let Some(id) = name_to_id.get(v) { account_id = Some(id.clone()) } else { /* leave account_id None */ } } }
                "category" | "category_id" | "categoryid" => { if !v.is_empty() { category_id = Some(v.to_string()) } }
                "memo" | "description" => { if !v.is_empty() { memo = Some(v.to_string()) } }
                "date" => { if !v.is_empty() { date = Some(v.to_string()) } }
                "amount" | "amount_cents" | "value" => {
                    if !v.is_empty() {
                        match parse_amount_to_cents(v) {
                            Ok(c) => amount_cents = Some(c),
                            Err(e) => errors.push(format!("amount: {}", e)),
                        }
                    }
                }
                _ => {}
            }
        }

        if date.is_none() { errors.push("missing date".into()) }
        if amount_cents.is_none() { errors.push("missing or invalid amount".into()) }

        // duplicate detection
        let dup = if let (Some(d), Some(a_cents)) = (date.clone(), amount_cents) {
            existing.iter().any(|ex| ex.date == d && ex.amount_cents == a_cents && ex.account_id == account_id && ex.memo == memo)
        } else { false };

        // if account name provided but no id resolved, add a warning
        if account_name.is_some() && account_id.is_none() {
            errors.push(format!("unknown account: {}", account_name.clone().unwrap_or_default()));
        }
        rows.push(ImportRowPreview { index: i, account_id, account_name, category_id, amount_cents, memo, date, errors, duplicate: dup });
    }

    let good = rows.iter().filter(|r| r.errors.is_empty()).count();
    let errors = rows.iter().filter(|r| !r.errors.is_empty()).count();
    let warnings = rows.iter().filter(|r| r.duplicate && r.errors.is_empty()).count();

    Ok(ImportPreviewResult { rows, good, errors, warnings })
}

#[command]
pub fn apply_import_csv(csv_text: String) -> Result<u64, String> {
    // Parse and write rows inside a DB transaction. On any failure, roll back.
    let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(csv_text.as_bytes());
    let headers = rdr.headers().map_err(|e| format!("CSV header error: {}", e))?.clone();

    let path = db_path();
    let mut conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;

    // fetch accounts for name resolution BEFORE starting transaction
    let accounts = crate::db::get_accounts(&conn).map_err(|e| format!("DB query error: {}", e))?;
    let name_to_id: std::collections::HashMap<String, String> = accounts.iter().map(|a| (a.name.clone(), a.id.clone())).collect();
    let id_set: std::collections::HashSet<String> = accounts.into_iter().map(|a| a.id).collect();

    let tx = conn.transaction().map_err(|e| format!("DB tx begin error: {}", e))?;
    let mut inserted: u64 = 0;

    for (row_idx, result) in rdr.records().enumerate() {
        let record = result.map_err(|e| format!("CSV parse error: {}", e))?;
        let mut acc = None;
        let mut cat = None;
        let mut memo = None;
        let mut date = None;
        let mut amount_cents: Option<i64> = None;
        for (h, v) in headers.iter().zip(record.iter()) {
            match h.to_lowercase().as_str() {
                "account" | "account_id" | "accountid" => { if !v.is_empty() { acc = Some(v.to_string()) } }
                "category" | "category_id" | "categoryid" => { if !v.is_empty() { cat = Some(v.to_string()) } }
                "memo" | "description" => { if !v.is_empty() { memo = Some(v.to_string()) } }
                "date" => { if !v.is_empty() { date = Some(v.to_string()) } }
                "amount" | "amount_cents" | "value" => {
                    if !v.is_empty() {
                        match parse_amount_to_cents(v) {
                            Ok(c) => amount_cents = Some(c),
                            Err(e) => return Err(format!("amount parse error: {}", e)),
                        }
                    }
                }
                _ => {}
            }
        }
        if date.is_none() || amount_cents.is_none() {
            return Err("missing required fields (date/amount)".into())
        }

        // resolve account by name if needed
        let resolved_account = if let Some(a) = acc.clone() {
            if id_set.contains(&a) {
                Some(a)
            } else if let Some(id) = name_to_id.get(&a) {
                Some(id.clone())
            } else {
                return Err(format!("unknown account name '{}' on row {}", a, row_idx + 1));
            }
        } else { None };

        let ct = crate::db::CreateTransaction { account_id: resolved_account, category_id: cat, amount_cents: amount_cents.unwrap(), memo, date: date.unwrap() };
        crate::db::insert_transaction(&tx, ct).map_err(|e| format!("DB insert error: {}", e))?;
        inserted += 1;
    }

    tx.commit().map_err(|e| format!("DB tx commit error: {}", e))?;
    Ok(inserted)
}

#[command]
pub fn export_transactions_csv(filter: Option<GetTransactionsFilter>, dest_path: Option<String>) -> Result<String, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    let paged = crate::db::get_transactions_paginated(&conn, filter).map_err(|e| format!("DB query error: {}", e))?;

    // resolve account id -> name map
    let accounts = crate::db::get_accounts(&conn).map_err(|e| format!("DB query error: {}", e))?;
    let account_map: std::collections::HashMap<String, String> = accounts.into_iter().map(|a| (a.id, a.name)).collect();

    let out_path = if let Some(p) = dest_path {
        std::path::PathBuf::from(p)
    } else {
        let out_dir = directories::ProjectDirs::from("com", "example", "ClinchrFT").unwrap().data_dir().to_path_buf();
        std::fs::create_dir_all(&out_dir).map_err(|e| format!("create dir error: {}", e))?;
        let fname = format!("transactions-{}.csv", chrono::Utc::now().format("%Y%m%d%H%M%S"));
        out_dir.join(fname)
    };

    let mut wtr = csv::Writer::from_path(&out_path).map_err(|e| format!("CSV write error: {}", e))?;
    wtr.write_record(&["Transaction ID","Date","Account","Category","Memo","Amount"]).map_err(|e| format!("CSV write error: {}", e))?;
    for r in paged.items.iter() {
        let account_name = match &r.account_id {
            Some(id) => account_map.get(id).cloned().unwrap_or_default(),
            None => String::new(),
        };
        let amount = format_cents_to_dollars(r.amount_cents);
        wtr.write_record(&[&r.id, &r.date, &account_name, &r.category_id.clone().unwrap_or_default(), &r.memo.clone().unwrap_or_default(), &amount]).map_err(|e| format!("CSV write error: {}", e))?;
    }
    wtr.flush().map_err(|e| format!("CSV flush error: {}", e))?;
    Ok(out_path.to_string_lossy().to_string())
}

#[command]
pub fn export_transactions_csv_data(filter: Option<GetTransactionsFilter>) -> Result<String, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    let paged = crate::db::get_transactions_paginated(&conn, filter).map_err(|e| format!("DB query error: {}", e))?;

    // resolve account id -> name map
    let accounts = crate::db::get_accounts(&conn).map_err(|e| format!("DB query error: {}", e))?;
    let account_map: std::collections::HashMap<String, String> = accounts.into_iter().map(|a| (a.id, a.name)).collect();

    let mut wtr = csv::Writer::from_writer(Vec::new());
    wtr.write_record(&["Transaction ID","Date","Account","Category","Memo","Amount"]).map_err(|e| format!("CSV write error: {}", e))?;
    for r in paged.items.iter() {
        let account_name = match &r.account_id {
            Some(id) => account_map.get(id).cloned().unwrap_or_default(),
            None => String::new(),
        };
        let amount = format_cents_to_dollars(r.amount_cents);
        wtr.write_record(&[&r.id, &r.date, &account_name, &r.category_id.clone().unwrap_or_default(), &r.memo.clone().unwrap_or_default(), &amount]).map_err(|e| format!("CSV write error: {}", e))?;
    }
    wtr.flush().map_err(|e| format!("CSV flush error: {}", e))?;
    let data = wtr.into_inner().map_err(|e| format!("CSV into_inner error: {}", e))?;
    String::from_utf8(data).map_err(|e| format!("CSV utf8 error: {}", e))
}

fn format_cents_to_dollars(cents: i64) -> String {
    let negative = cents < 0;
    let abs = if negative { -cents } else { cents };
    let whole = abs / 100;
    let frac = abs % 100;
    if negative {
        format!("-{}.{:02}", whole, frac)
    } else {
        format!("{}.{:02}", whole, frac)
    }
}

#[command]
pub fn create_backup(dest_path: String) -> Result<String, String> {
    let src = db_path();
    fs::copy(&src, &dest_path).map_err(|e| format!("backup copy error: {}", e))?;
    Ok(dest_path)
}

#[command]
pub fn restore_backup(src_path: String) -> Result<(), String> {
    let dst = db_path();
    let backup = dst.with_extension("bak");
    // make a backup of current DB
    fs::copy(&dst, &backup).map_err(|e| format!("backup current db failed: {}", e))?;
    // attempt to copy new DB in place
    match fs::copy(&src_path, &dst) {
        Ok(_) => Ok(()),
        Err(e) => {
            // attempt rollback
            let _ = fs::copy(&backup, &dst);
            Err(format!("restore failed: {}", e))
        }
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use serial_test::serial;

    #[test]
    #[serial]
    fn commands_roundtrip_via_override_path() {
        // Create a temporary file path and point commands at it.
        let tmp = NamedTempFile::new().expect("tempfile");
        std::env::set_var("CLINCHRFT_DB_PATH", tmp.path().to_string_lossy().to_string());

        // Create parent rows in the DB so FK constraints are satisfied.
        let path = std::env::var("CLINCHRFT_DB_PATH").unwrap();
        let conn = crate::db::open_db(std::path::Path::new(&path)).expect("open db");
        let acc = crate::db::insert_account(&conn, "test-account", None).expect("insert acc");
        let cat = crate::db::insert_category(&conn, "test-category", None, None).expect("insert cat");

        // Create a transaction via the command wrapper.
        let created = create_transaction(CreateTransaction {
            account_id: Some(acc.id.clone()),
            category_id: Some(cat.id.clone()),
            amount_cents: 200,
            memo: Some("roundtrip".into()),
            date: "2026-07-02".into(),
        })
        .expect("create failed");

        // Update amount via the command wrapper.
        let updated = update_transaction(
            created.id.clone(),
            UpdateTransaction {
                account_id: None,
                category_id: None,
                amount_cents: Some(250),
                memo: None,
                date: None,
            },
        )
        .expect("update failed");
        assert_eq!(updated.amount_cents, 250);

        // Delete and confirm removal.
        delete_transaction(created.id.clone()).expect("delete failed");
        let all = get_transactions(None).expect("get failed");
        assert!(all.items.iter().all(|r| r.id != created.id));
    }

    #[test]
    #[serial]
    fn export_transactions_csv_writes_filtered_file() {
        use std::fs::read_to_string;
        // create temp DB and point commands at it
        let tmp_db = NamedTempFile::new().expect("tempfile db");
        std::env::set_var("CLINCHRFT_DB_PATH", tmp_db.path().to_string_lossy().to_string());

        // open and seed DB
        let path = std::env::var("CLINCHRFT_DB_PATH").unwrap();
        let conn = crate::db::open_db(std::path::Path::new(&path)).expect("open db");
        let acc1 = crate::db::insert_account(&conn, "Checking", None).expect("insert acc1");
        let acc2 = crate::db::insert_account(&conn, "Savings", None).expect("insert acc2");

        // transactions: one inside range for acc1, one inside range for acc2, one outside
        let _t1 = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc1.id.clone()), category_id: None, amount_cents: 123, memo: Some("in-range-1".into()), date: "2026-07-02".into() }).expect("insert t1");
        let _t2 = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc2.id.clone()), category_id: None, amount_cents: 250, memo: Some("in-range-2".into()), date: "2026-07-05".into() }).expect("insert t2");
        let _t3 = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc1.id.clone()), category_id: None, amount_cents: 999, memo: Some("out-range".into()), date: "2026-06-01".into() }).expect("insert t3");

        // create temp dest path
        let tmp_out = NamedTempFile::new().expect("tempfile out");
        let out_path = tmp_out.path().to_string_lossy().to_string();

        // prepare filter for July 2026
        let filter = GetTransactionsFilter { start_date: Some("2026-07-01".into()), end_date: Some("2026-07-31".into()), account_id: None, category_id: None, min_amount_cents: None, max_amount_cents: None, q: None, sort_by: None, sort_dir: None, limit: None, offset: None };

        let res = export_transactions_csv(Some(filter), Some(out_path.clone())).expect("export failed");
        assert_eq!(res, out_path);

        // read CSV and assert contents
        let csv_text = read_to_string(&out_path).expect("read out");
        let mut rdr = csv::Reader::from_reader(csv_text.as_bytes());
        let headers = rdr.headers().expect("headers").clone();
        assert_eq!(headers.iter().collect::<Vec<_>>(), vec!["Transaction ID","Date","Account","Category","Memo","Amount"]);

        let rows = rdr.records().map(|r| r.expect("rec")).collect::<Vec<_>>();
        // should contain only the two in-range transactions
        assert_eq!(rows.len(), 2);

        // check first row contains account name and formatted amount
        let first = &rows[0];
        // columns: id,date,account,category,memo,amount
        assert!(first.get(2).unwrap() == "Checking" || first.get(2).unwrap() == "Savings");
        assert!(first.get(5).unwrap() == "1.23" || first.get(5).unwrap() == "2.50");
    }

    #[test]
    #[serial]
    fn aggregate_commands_return_expected_totals() {
        // create temp DB and point commands at it
        let tmp_db = NamedTempFile::new().expect("tempfile db");
        std::env::set_var("CLINCHRFT_DB_PATH", tmp_db.path().to_string_lossy().to_string());

        // open and seed DB
        let path = std::env::var("CLINCHRFT_DB_PATH").unwrap();
        let conn = crate::db::open_db(std::path::Path::new(&path)).expect("open db");
        let acc = crate::db::insert_account(&conn, "A1", None).expect("insert acc");
        let cat_food = crate::db::insert_category(&conn, "Food", None, None).expect("insert cat");

        // insert transactions across two dates
        let _t1 = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc.id.clone()), category_id: Some(cat_food.id.clone()), amount_cents: 100, memo: Some("t1".into()), date: "2026-07-01".into() }).expect("insert t1");
        let _t2 = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc.id.clone()), category_id: None, amount_cents: 50, memo: Some("t2".into()), date: "2026-07-01".into() }).expect("insert t2");
        let _t3 = crate::db::insert_transaction(&conn, CreateTransaction { account_id: Some(acc.id.clone()), category_id: Some(cat_food.id.clone()), amount_cents: 200, memo: Some("t3".into()), date: "2026-07-02".into() }).expect("insert t3");

        // call aggregate by category
        let filter = GetTransactionsFilter { start_date: Some("2026-07-01".into()), end_date: Some("2026-07-31".into()), account_id: None, category_id: None, min_amount_cents: None, max_amount_cents: None, q: None, sort_by: None, sort_dir: None, limit: None, offset: None };
        let cat_res = get_transactions_aggregate_by_category(Some(filter)).expect("agg failed");
        // Expect two aggregates: one for Food and one for null/uncategorized
        assert!(cat_res.iter().any(|a| a.category_id.as_deref() == Some(&cat_food.id) && a.total_amount_cents == 300));
        assert!(cat_res.iter().any(|a| a.category_id.is_none() && a.total_amount_cents == 50));

        // call aggregate by date (day) - command returns flattened rows per bucket+category
        let date_res = get_transactions_aggregate_by_date(None, "day".to_string()).expect("date agg failed");
        // Expect a row for 2026-07-01 + Food (100) and 2026-07-01 + null (50)
        assert!(date_res.iter().any(|r| r.bucket == "2026-07-01" && r.category_id.as_deref() == Some(&cat_food.id) && r.total_amount_cents == 100));
        assert!(date_res.iter().any(|r| r.bucket == "2026-07-01" && r.category_id.is_none() && r.total_amount_cents == 50));
        assert!(date_res.iter().any(|r| r.bucket == "2026-07-02" && r.category_id.as_deref() == Some(&cat_food.id) && r.total_amount_cents == 200));
    }
}
