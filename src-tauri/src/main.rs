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
            commands::get_app_path,
            // CSV import/export and backup/restore
            commands::preview_import_csv,
            commands::apply_import_csv,
            commands::export_transactions_csv_data,
            commands::export_transactions_csv,
            commands::create_backup,
            commands::restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
