use tauri::command;
use std::path::PathBuf;

use crate::db::{open_db, CreateTransaction, UpdateTransaction, TransactionRow, AccountRow, CategoryRow};

fn db_path() -> PathBuf {
    // Allow tests or CI to override the DB path by setting CLINCHRFT_DB_PATH.
    if let Some(p) = std::env::var_os("CLINCHRFT_DB_PATH") {
        return PathBuf::from(p);
    }

    // Developer convenience: allow repo-local DB when explicitly requested.
    if std::env::var_os("CLINCHRFT_USE_REPO_DB").is_some() {
        let cwd = std::env::current_dir().unwrap_or_else(|_| std::env::temp_dir());
        let data_dir = cwd.join("data");
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
pub fn get_transactions() -> Result<Vec<TransactionRow>, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::get_transactions(&conn).map_err(|e| format!("DB query error: {}", e))
}

#[command]
pub fn create_transaction(tx: CreateTransaction) -> Result<TransactionRow, String> {
    let path = db_path();
    let conn = open_db(&path).map_err(|e| format!("DB open error: {}", e))?;
    crate::db::insert_transaction(&conn, tx).map_err(|e| format!("DB insert error: {}", e))
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

#[command]
pub fn get_app_path() -> String {
    let proj_dirs = directories::ProjectDirs::from("com", "example", "ClinchrFT").unwrap();
    proj_dirs.data_dir().to_string_lossy().to_string()
}


#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
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
        let all = get_transactions().expect("get failed");
        assert!(all.iter().all(|r| r.id != created.id));
    }
}
