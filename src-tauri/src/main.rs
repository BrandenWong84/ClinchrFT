#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_transactions,
            commands::get_accounts,
            commands::get_categories,
            commands::get_app_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
