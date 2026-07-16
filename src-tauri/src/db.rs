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
COMMIT;",
    )?;
    Ok(())
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
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO accounts (id, name, notes) VALUES (?1,?2,?3)",
        params![id, name, notes],
    )?;
    let mut stmt = conn.prepare("SELECT id, name, notes, created_at, deleted_at FROM accounts WHERE id = ?1")?;
    let row = stmt.query_row(params![id], |r| {
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
}
