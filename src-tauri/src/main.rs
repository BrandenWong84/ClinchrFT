#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_transactions,
            commands::create_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::get_accounts,
                commands::create_account,
            commands::get_categories,
            commands::get_app_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
