#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rand::{distr::Alphanumeric, Rng};
use std::net::TcpListener;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let port = TcpListener::bind("127.0.0.1:0")?.local_addr()?.port();
            let token: String = rand::rng()
                .sample_iter(&Alphanumeric)
                .take(48)
                .map(char::from)
                .collect();
            let (mut events, _child) = app
                .shell()
                .sidecar("forge-sidecar")?
                .args(["--port", &port.to_string()])
                .env("FORGE_SIDECAR_TOKEN", &token)
                .spawn()?;
            tauri::async_runtime::spawn(async move {
                while let Some(_event) = events.recv().await {}
            });
            app.manage(SidecarAddress {
                base_url: format!("http://127.0.0.1:{port}"),
                token,
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running FORGE Org Tool desktop host");
}

struct SidecarAddress {
    base_url: String,
    token: String,
}
