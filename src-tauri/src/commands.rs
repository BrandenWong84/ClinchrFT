use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
pub struct TransactionStub {
    pub id: String,
    pub account_id: String,
    pub category_id: Option<String>,
    pub amount_cents: i64,
    pub memo: Option<String>,
    pub date: String,
}

#[command]
pub fn get_transactions() -> Vec<TransactionStub> {
    vec![TransactionStub {
        id: "1".into(),
        account_id: "a1".into(),
        category_id: Some("c1".into()),
        amount_cents: 12345,
        memo: Some("Coffee".into()),
        date: "2026-07-01".into(),
    }]
}

#[command]
pub fn get_accounts() -> Vec<(String, String)> {
    vec![("a1".into(), "Checking".into())]
}

#[command]
pub fn get_categories() -> Vec<(String, String)> {
    vec![("c1".into(), "Food".into())]
}

#[command]
pub fn get_app_path() -> String {
    let proj_dirs = directories::ProjectDirs::from("com", "example", "ClinchrFT").unwrap();
    proj_dirs.data_dir().to_string_lossy().to_string()
}
