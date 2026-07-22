use anyhow::Result;
use rusqlite::{params, Connection};
use serde::Serialize;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionRow {
    pub id: String,
    pub account_id: Option<String>,
    pub category_id: Option<String>,
    pub amount_cents: i64,
    pub memo: Option<String>,
    pub date: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTransaction {
    pub account_id: Option<String>,
    pub category_id: Option<String>,
    pub amount_cents: i64,
    pub memo: Option<String>,
    pub date: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTransaction {
    pub account_id: Option<Option<String>>,
    pub category_id: Option<Option<String>>,
    pub amount_cents: Option<i64>,
    pub memo: Option<Option<String>>,
    pub date: Option<String>,
}

pub fn open_db(path: &Path) -> Result<Connection> {
    let conn = Connection::open(path)?;
    run_migrations(&conn)?;
    Ok(conn)
}

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "BEGIN;
CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME NULL);
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT NULL, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME NULL);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, account_id TEXT NULL REFERENCES accounts(id) ON DELETE SET NULL, category_id TEXT NULL REFERENCES categories(id) ON DELETE SET NULL, amount_cents INTEGER NOT NULL, memo TEXT, date TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
-- If duplicate account names already exist, delete duplicates keeping the first row per name before creating the unique index.
DELETE FROM accounts
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM accounts GROUP BY name
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
COMMIT;",
    )?;
    Ok(())
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTransactionsFilter {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub account_id: Option<String>,
    pub category_id: Option<String>,
    pub min_amount_cents: Option<i64>,
    pub max_amount_cents: Option<i64>,
    pub q: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedTransactions {
    pub items: Vec<TransactionRow>,
    pub total: u64,
    pub limit: u32,
    pub offset: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryAggregate {
    pub category_id: Option<String>,
    pub total_amount_cents: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DateAggregate {
    pub date: String,
    pub total_amount_cents: i64,
}

// Some helpers are currently unused by the Rust-side code but are intentionally
// provided for completeness and future use via the Tauri command layer. Silence
// dead-code warnings until those functions are wired up.
#[allow(dead_code)]


pub fn get_transactions_paginated(conn: &Connection, filter: Option<GetTransactionsFilter>) -> Result<PaginatedTransactions> {
    let f = filter.unwrap_or(GetTransactionsFilter {
        start_date: None,
        end_date: None,
        account_id: None,
        category_id: None,
        min_amount_cents: None,
        max_amount_cents: None,
        q: None,
        sort_by: None,
        sort_dir: None,
        limit: None,
        offset: None,
    });

    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(sd) = f.start_date {
        where_clauses.push("date >= ?".to_string());
        params_vec.push(rusqlite::types::Value::from(sd));
    }
    if let Some(ed) = f.end_date {
        where_clauses.push("date <= ?".to_string());
        params_vec.push(rusqlite::types::Value::from(ed));
    }
    if let Some(acc) = f.account_id {
        where_clauses.push("account_id = ?".to_string());
        params_vec.push(rusqlite::types::Value::from(acc));
    }
    if let Some(cat) = f.category_id {
        where_clauses.push("category_id = ?".to_string());
        params_vec.push(rusqlite::types::Value::from(cat));
    }
    if let Some(min_a) = f.min_amount_cents {
        where_clauses.push("amount_cents >= ?".to_string());
        params_vec.push(rusqlite::types::Value::from(min_a));
    }
    if let Some(max_a) = f.max_amount_cents {
        where_clauses.push("amount_cents <= ?".to_string());
        params_vec.push(rusqlite::types::Value::from(max_a));
    }
    if let Some(q) = f.q {
        where_clauses.push("memo LIKE ?".to_string());
        let pattern = format!("%{}%", q.replace('%', "\\%").replace('_', "\\_"));
        params_vec.push(rusqlite::types::Value::from(pattern));
    }

    let where_sql = if where_clauses.is_empty() {
        "".to_string()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    // total count
    let count_sql = format!("SELECT COUNT(*) FROM transactions {}", where_sql);
    let mut count_stmt = conn.prepare(&count_sql)?;
    let total: u64 = count_stmt.query_row(rusqlite::params_from_iter(params_vec.clone().into_iter()), |r| r.get(0))?;

    // sorting
    let sort_col = match f.sort_by.as_deref() {
        Some("amount") => "amount_cents",
        _ => "date",
    };
    let sort_dir = match f.sort_dir.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    // pagination defaults and caps
    let mut limit: u32 = f.limit.unwrap_or(50);
    if limit == 0 { limit = 50 }
    if limit > 1000 { limit = 1000 }
    let offset: u32 = f.offset.unwrap_or(0);

    // build select
    let select_sql = format!(
        "SELECT id, account_id, category_id, amount_cents, memo, date FROM transactions {} ORDER BY {} {} LIMIT ? OFFSET ?",
        where_sql, sort_col, sort_dir
    );

    // params for select: same where params, then limit, offset
    let mut params_for_select = params_vec.clone();
    params_for_select.push(rusqlite::types::Value::from(limit as i64));
    params_for_select.push(rusqlite::types::Value::from(offset as i64));

    let mut stmt = conn.prepare(&select_sql)?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params_for_select.into_iter()), |r| {
            Ok(TransactionRow {
                id: r.get(0)?,
                account_id: r.get(1)?,
                category_id: r.get(2)?,
                amount_cents: r.get(3)?,
                memo: r.get(4)?,
                date: r.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, rusqlite::Error>>()?;

    Ok(PaginatedTransactions { items: rows, total, limit, offset })
}

pub fn get_transactions_aggregate_by_category(conn: &Connection, start_date: Option<String>, end_date: Option<String>, account_id: Option<String>) -> Result<Vec<CategoryAggregate>> {
    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    if let Some(sd) = start_date { where_clauses.push("date >= ?".to_string()); params_vec.push(rusqlite::types::Value::from(sd)); }
    if let Some(ed) = end_date { where_clauses.push("date <= ?".to_string()); params_vec.push(rusqlite::types::Value::from(ed)); }
    if let Some(a) = account_id { where_clauses.push("account_id = ?".to_string()); params_vec.push(rusqlite::types::Value::from(a)); }
    let where_sql = if where_clauses.is_empty() { "".to_string() } else { format!("WHERE {}", where_clauses.join(" AND ")) };
    let sql = format!("SELECT category_id, SUM(amount_cents) as total_amount_cents FROM transactions {} GROUP BY category_id", where_sql);
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params_vec.into_iter()), |r| {
            Ok(CategoryAggregate { category_id: r.get(0)?, total_amount_cents: r.get(1)? })
        })?
        .collect::<Result<Vec<_>, rusqlite::Error>>()?;
    Ok(rows)
}

pub fn get_transactions_aggregate_by_date(conn: &Connection, start_date: Option<String>, end_date: Option<String>, interval: &str) -> Result<Vec<DateAggregate>> {
    // interval: day | month
    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    if let Some(sd) = start_date { where_clauses.push("date >= ?".to_string()); params_vec.push(rusqlite::types::Value::from(sd)); }
    if let Some(ed) = end_date { where_clauses.push("date <= ?".to_string()); params_vec.push(rusqlite::types::Value::from(ed)); }
    let where_sql = if where_clauses.is_empty() { "".to_string() } else { format!("WHERE {}", where_clauses.join(" AND ")) };

    let date_fmt = match interval {
        "month" => "%Y-%m",
        _ => "%Y-%m-%d",
    };
    let sql = format!("SELECT strftime('{}', date) as d, SUM(amount_cents) as total_amount_cents FROM transactions {} GROUP BY d ORDER BY d", date_fmt, where_sql);
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params_vec.into_iter()), |r| {
            Ok(DateAggregate { date: r.get(0)?, total_amount_cents: r.get(1)? })
        })?
        .collect::<Result<Vec<_>, rusqlite::Error>>()?;
    Ok(rows)
}

pub fn get_transactions(conn: &Connection) -> Result<Vec<TransactionRow>> {
    let mut stmt = conn.prepare("SELECT id, account_id, category_id, amount_cents, memo, date FROM transactions ORDER BY date DESC")?;
    let rows = stmt
        .query_map([], |r| {
            Ok(TransactionRow {
                id: r.get(0)?,
                account_id: r.get(1)?,
                category_id: r.get(2)?,
                amount_cents: r.get(3)?,
                memo: r.get(4)?,
                date: r.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, rusqlite::Error>>()?;
    Ok(rows)
}

pub fn insert_transaction(conn: &Connection, tx: CreateTransaction) -> Result<TransactionRow> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO transactions (id, account_id, category_id, amount_cents, memo, date) VALUES (?1,?2,?3,?4,?5,?6)",
        params![id, tx.account_id, tx.category_id, tx.amount_cents, tx.memo, tx.date],
    )?;
    Ok(TransactionRow {
        id,
        account_id: tx.account_id,
        category_id: tx.category_id,
        amount_cents: tx.amount_cents,
        memo: tx.memo,
        date: tx.date,
    })
}

pub fn update_transaction(conn: &Connection, id: &str, tx: UpdateTransaction) -> Result<Option<TransactionRow>> {
    // Build update dynamically using a running parameter index to avoid
    // relying on parts.len() (clearer and less error-prone).
    let mut parts: Vec<String> = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    let mut param_index: usize = 1;

    if let Some(account_id_opt) = tx.account_id {
        parts.push(format!("account_id = ?{}", param_index));
        match account_id_opt {
            Some(v) => params_vec.push(rusqlite::types::Value::from(v)),
            None => params_vec.push(rusqlite::types::Value::Null),
        }
        param_index += 1;
    }
    if let Some(category_id_opt) = tx.category_id {
        parts.push(format!("category_id = ?{}", param_index));
        match category_id_opt {
            Some(v) => params_vec.push(rusqlite::types::Value::from(v)),
            None => params_vec.push(rusqlite::types::Value::Null),
        }
        param_index += 1;
    }
    if let Some(amount_cents) = tx.amount_cents {
        parts.push(format!("amount_cents = ?{}", param_index));
        params_vec.push(rusqlite::types::Value::from(amount_cents));
        param_index += 1;
    }
    if let Some(memo_opt) = tx.memo {
        parts.push(format!("memo = ?{}", param_index));
        match memo_opt {
            Some(v) => params_vec.push(rusqlite::types::Value::from(v)),
            None => params_vec.push(rusqlite::types::Value::Null),
        }
        param_index += 1;
    }
    if let Some(date) = tx.date {
        parts.push(format!("date = ?{}", param_index));
        params_vec.push(rusqlite::types::Value::from(date));
        param_index += 1;
    }

    if parts.is_empty() {
        // nothing to update
        return Ok(get_transactions(conn)?.into_iter().find(|r| r.id == id));
    }

    // final param is id
    let sql = format!(
        "UPDATE transactions SET {} WHERE id = ?{}",
        parts.join(","),
        param_index
    );

    // append id as an owned Value and consume the vector when executing
    params_vec.push(rusqlite::types::Value::from(id.to_string()));

    let mut stmt = conn.prepare(&sql)?;
    stmt.execute(rusqlite::params_from_iter(params_vec.into_iter()))?;

    Ok(get_transactions(conn)?.into_iter().find(|r| r.id == id))
}

pub fn delete_transaction(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM transactions WHERE id = ?1", params![id])?;
    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountRow {
    pub id: String,
    pub name: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRow {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

pub fn get_accounts(conn: &Connection) -> Result<Vec<AccountRow>> {
    let mut stmt = conn.prepare("SELECT id, name, notes, created_at, deleted_at FROM accounts ORDER BY name")?;
    let rows = stmt
        .query_map([], |r| {
            Ok(AccountRow {
                id: r.get(0)?,
                name: r.get(1)?,
                notes: r.get(2)?,
                created_at: r.get(3)?,
                deleted_at: r.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, rusqlite::Error>>()?;
    Ok(rows)
}

pub fn insert_account(conn: &Connection, name: &str, notes: Option<String>) -> Result<AccountRow> {
    // Attempt to insert; if an account with the same name exists, ignore the error
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR IGNORE INTO accounts (id, name, notes) VALUES (?1,?2,?3)",
        params![id, name, notes],
    )?;
    // Return the account with this name (either newly inserted or existing)
    let mut stmt = conn.prepare("SELECT id, name, notes, created_at, deleted_at FROM accounts WHERE name = ?1")?;
    let row = stmt.query_row(params![name], |r| {
        Ok(AccountRow {
            id: r.get(0)?,
            name: r.get(1)?,
            notes: r.get(2)?,
            created_at: r.get(3)?,
            deleted_at: r.get(4)?,
        })
    })?;
    Ok(row)
}

pub fn update_account(conn: &Connection, id: &str, name: Option<String>, notes: Option<Option<String>>) -> Result<Option<AccountRow>> {
    let mut parts: Vec<String> = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    let mut idx = 1;
    if let Some(n) = name {
        parts.push(format!("name = ?{}", idx));
        params_vec.push(rusqlite::types::Value::from(n));
        idx += 1;
    }
    if let Some(notes_opt) = notes {
        parts.push(format!("notes = ?{}", idx));
        match notes_opt {
            Some(v) => params_vec.push(rusqlite::types::Value::from(v)),
            None => params_vec.push(rusqlite::types::Value::Null),
        }
        idx += 1;
    }
    if parts.is_empty() {
        return Ok(get_accounts(conn)?.into_iter().find(|r| r.id == id));
    }
    let sql = format!("UPDATE accounts SET {} WHERE id = ?{}", parts.join(","), idx);
    params_vec.push(rusqlite::types::Value::from(id.to_string()));
    let mut stmt = conn.prepare(&sql)?;
    stmt.execute(rusqlite::params_from_iter(params_vec.into_iter()))?;
    Ok(get_accounts(conn)?.into_iter().find(|r| r.id == id))
}

pub fn delete_account(conn: &Connection, id: &str) -> Result<()> {
    // Soft-delete: set deleted_at to CURRENT_TIMESTAMP. Transactions will keep account_id but
    // referential integrity is protected by ON DELETE SET NULL if a hard delete is ever performed.
    conn.execute("UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_categories(conn: &Connection) -> Result<Vec<CategoryRow>> {
    let mut stmt = conn.prepare("SELECT id, name, parent_id, notes, created_at, deleted_at FROM categories ORDER BY name")?;
    let rows = stmt
        .query_map([], |r| {
            Ok(CategoryRow {
                id: r.get(0)?,
                name: r.get(1)?,
                parent_id: r.get(2)?,
                notes: r.get(3)?,
                created_at: r.get(4)?,
                deleted_at: r.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, rusqlite::Error>>()?;
    Ok(rows)
}

pub fn insert_category(conn: &Connection, name: &str, parent_id: Option<String>, notes: Option<String>) -> Result<CategoryRow> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO categories (id, name, parent_id, notes) VALUES (?1,?2,?3,?4)",
        params![id, name, parent_id, notes],
    )?;
    let mut stmt = conn.prepare("SELECT id, name, parent_id, notes, created_at, deleted_at FROM categories WHERE id = ?1")?;
    let row = stmt.query_row(params![id], |r| {
        Ok(CategoryRow {
            id: r.get(0)?,
            name: r.get(1)?,
            parent_id: r.get(2)?,
            notes: r.get(3)?,
            created_at: r.get(4)?,
            deleted_at: r.get(5)?,
        })
    })?;
    Ok(row)
}

pub fn update_category(conn: &Connection, id: &str, name: Option<String>, parent_id: Option<Option<String>>, notes: Option<Option<String>>) -> Result<Option<CategoryRow>> {
    let mut parts: Vec<String> = Vec::new();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    let mut idx = 1;
    if let Some(n) = name {
        parts.push(format!("name = ?{}", idx));
        params_vec.push(rusqlite::types::Value::from(n));
        idx += 1;
    }
    if let Some(parent_opt) = parent_id {
        parts.push(format!("parent_id = ?{}", idx));
        match parent_opt {
            Some(v) => params_vec.push(rusqlite::types::Value::from(v)),
            None => params_vec.push(rusqlite::types::Value::Null),
        }
        idx += 1;
    }
    if let Some(notes_opt) = notes {
        parts.push(format!("notes = ?{}", idx));
        match notes_opt {
            Some(v) => params_vec.push(rusqlite::types::Value::from(v)),
            None => params_vec.push(rusqlite::types::Value::Null),
        }
        idx += 1;
    }
    if parts.is_empty() {
        return Ok(get_categories(conn)?.into_iter().find(|r| r.id == id));
    }
    let sql = format!("UPDATE categories SET {} WHERE id = ?{}", parts.join(","), idx);
    params_vec.push(rusqlite::types::Value::from(id.to_string()));
    let mut stmt = conn.prepare(&sql)?;
    stmt.execute(rusqlite::params_from_iter(params_vec.into_iter()))?;
    Ok(get_categories(conn)?.into_iter().find(|r| r.id == id))
}

pub fn delete_category(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?1", params![id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crud_roundtrip() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let acc = insert_account(&conn, "test-account", None).unwrap();
        let cat = insert_category(&conn, "test-category", None, None).unwrap();

        let created = insert_transaction(
            &conn,
            CreateTransaction {
                account_id: Some(acc.id.clone()),
                category_id: Some(cat.id.clone()),
                amount_cents: 100,
                memo: Some("t".into()),
                date: "2026-07-01".into(),
            },
        )
        .unwrap();

        let all = get_transactions(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, created.id);

        // update memo
        let updated = update_transaction(
            &conn,
            &created.id,
            UpdateTransaction {
                account_id: None,
                category_id: None,
                amount_cents: None,
                memo: Some(Some("updated".into())),
                date: None,
            },
        )
        .unwrap()
        .unwrap();
        assert_eq!(updated.memo.as_deref(), Some("updated"));

        delete_transaction(&conn, &created.id).unwrap();
        let all2 = get_transactions(&conn).unwrap();
        assert!(all2.is_empty());
    }

    #[test]
    fn duplicate_account_prevented() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let a1 = insert_account(&conn, "default", None).unwrap();
        // Attempt to insert same name again
        let a2 = insert_account(&conn, "default", None).unwrap();

        // Both calls should return an account with the same name and the DB should only contain one row for that name
        assert_eq!(a1.name, a2.name);

        let all = get_accounts(&conn).unwrap();
        let matches: Vec<_> = all.into_iter().filter(|r| r.name == "default").collect();
        assert_eq!(matches.len(), 1, "expected only one account row with name 'default'");
    }

    #[test]
    fn migration_dedupes_existing_duplicates() {
        let conn = Connection::open_in_memory().unwrap();

        // Create the accounts table and insert duplicate rows directly (simulate older DB state)
        conn.execute_batch(
            "BEGIN;
CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME NULL);
COMMIT;",
        )
        .unwrap();

        let id1 = Uuid::new_v4().to_string();
        let id2 = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO accounts (id, name, notes) VALUES (?1, ?2, ?3)",
            params![id1, "default", Option::<String>::None],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO accounts (id, name, notes) VALUES (?1, ?2, ?3)",
            params![id2, "default", Option::<String>::None],
        )
        .unwrap();

        // Ensure duplicates exist
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM accounts WHERE name = ?1").unwrap();
        let cnt: i64 = stmt.query_row(params!["default"], |r| r.get(0)).unwrap();
        assert_eq!(cnt, 2, "setup should have inserted two duplicate rows");

        // Run migrations; the migration should remove duplicates and create the unique index
        run_migrations(&conn).unwrap();

        let mut stmt2 = conn.prepare("SELECT COUNT(*) FROM accounts WHERE name = ?1").unwrap();
        let cnt2: i64 = stmt2.query_row(params!["default"], |r| r.get(0)).unwrap();
        assert_eq!(cnt2, 1, "migration should remove duplicate account rows");

        // verify index exists
        let mut idx_stmt = conn
            .prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_accounts_name'")
            .unwrap();
        let idx_count: i64 = idx_stmt.query_row([], |r| r.get(0)).unwrap();
        assert_eq!(idx_count, 1, "expected idx_accounts_name to exist after migration");
    }

    #[test]
    fn aggregates_by_date_runs() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let acc = insert_account(&conn, "agg-acc", None).unwrap();
        let cat = insert_category(&conn, "agg-cat", None, None).unwrap();

        insert_transaction(
            &conn,
            CreateTransaction {
                account_id: Some(acc.id.clone()),
                category_id: Some(cat.id.clone()),
                amount_cents: 100,
                memo: Some("t1".into()),
                date: "2020-01-15".into(),
            },
        )
        .unwrap();

        insert_transaction(
            &conn,
            CreateTransaction {
                account_id: Some(acc.id.clone()),
                category_id: Some(cat.id.clone()),
                amount_cents: 200,
                memo: Some("t2".into()),
                date: "2020-02-03".into(),
            },
        )
        .unwrap();

        let res = get_transactions_aggregate_by_date(&conn, Some("2020-01-01".into()), Some("2020-12-31".into()), "month");
        assert!(res.is_ok());
        let v = res.unwrap();
        assert!(v.len() >= 2, "expected at least two monthly buckets");
        assert!(v.iter().any(|d| d.date == "2020-01"));
        assert!(v.iter().any(|d| d.date == "2020-02"));
    }

    #[test]
    fn update_and_delete_account_roundtrip() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let acc = insert_account(&conn, "acct1", None).unwrap();
        let updated = update_account(&conn, &acc.id, Some("acct1-renamed".into()), Some(Some("notes".into())))
            .unwrap()
            .unwrap();
        assert_eq!(updated.name, "acct1-renamed");

        delete_account(&conn, &acc.id).unwrap();
        let all = get_accounts(&conn).unwrap();
        let found = all.into_iter().find(|a| a.id == acc.id).unwrap();
        assert!(found.deleted_at.is_some());
    }

    #[test]
    fn update_and_delete_category_roundtrip() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let cat = insert_category(&conn, "cat1", None, None).unwrap();
        let updated = update_category(&conn, &cat.id, Some("cat1-renamed".into()), None, Some(Some("cnotes".into())))
            .unwrap()
            .unwrap();
        assert_eq!(updated.name, "cat1-renamed");

        delete_category(&conn, &cat.id).unwrap();
        let all = get_categories(&conn).unwrap();
        let found = all.into_iter().find(|c| c.id == cat.id).unwrap();
        assert!(found.deleted_at.is_some());
    }
}
