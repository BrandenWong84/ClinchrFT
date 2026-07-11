use anyhow::Result;
use rusqlite::{Connection, params};

pub fn init_db(path: &str) -> Result<()> {
    let conn = Connection::open(path)?;
    conn.execute_batch("BEGIN;\nCREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, category_id TEXT, amount_cents INTEGER NOT NULL, memo TEXT, date TEXT NOT NULL);\nCOMMIT;")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn can_init_db() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("clinchrft.db").to_string_lossy().to_string();
        init_db(&path).expect("init should succeed");
    }
}
