#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use forge_org_desktop_policy::{validate_request, MAX_JSON_BODY};
use rand::{distr::Alphanumeric, Rng};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, RunEvent, State};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

const READINESS_TIMEOUT: Duration = Duration::from_secs(15);

struct DesktopTransport {
    port: Mutex<u16>,
    token: Mutex<String>,
    child: Mutex<Option<CommandChild>>,
    request_lock: Mutex<()>,
}

fn start_sidecar(app: &AppHandle) -> Result<(u16, String, CommandChild), String> {
    let port = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| format!("cannot reserve sidecar port: {error}"))?
        .local_addr()
        .map_err(|error| format!("cannot read sidecar port: {error}"))?
        .port();
    let token: String = rand::rng()
        .sample_iter(&Alphanumeric)
        .take(48)
        .map(char::from)
        .collect();
    let (mut events, mut child) = app
        .shell()
        .sidecar("forge-sidecar")
        .map_err(|error| format!("cannot locate sidecar: {error}"))?
        .args(["--port", &port.to_string()])
        .env("FORGE_SIDECAR_TOKEN", &token)
        .spawn()
        .map_err(|error| format!("cannot start sidecar: {error}"))?;
    tauri::async_runtime::spawn(async move { while events.recv().await.is_some() {} });
    if let Err(error) = wait_for_readiness(port, &token) {
        let _ = child.kill();
        return Err(error);
    }
    Ok((port, token, child))
}

fn http_request(
    port: u16,
    token: &str,
    method: &str,
    path: &str,
    body: &[u8],
) -> Result<(u16, String), String> {
    validate_request(method, path, body.len())
        .map_err(|error| format!("request rejected: {error:?}"))?;
    let address = format!("127.0.0.1:{port}")
        .parse()
        .map_err(|error| format!("sidecar address is invalid: {error}"))?;
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(1))
        .map_err(|error| format!("sidecar connection failed: {error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .map_err(|error| format!("sidecar read timeout setup failed: {error}"))?;
    let request = format!(
        "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAuthorization: Bearer {token}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream
        .write_all(request.as_bytes())
        .and_then(|_| stream.write_all(body))
        .map_err(|error| format!("sidecar request failed: {error}"))?;

    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .map_err(|error| format!("sidecar response failed: {error}"))?;
    let header_end = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or_else(|| "sidecar returned malformed HTTP".to_string())?;
    let headers = std::str::from_utf8(&response[..header_end])
        .map_err(|_| "sidecar returned invalid HTTP headers".to_string())?;
    let status = headers
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .ok_or_else(|| "sidecar returned no HTTP status".to_string())?
        .parse::<u16>()
        .map_err(|_| "sidecar returned an invalid HTTP status".to_string())?;
    let body = String::from_utf8(response[header_end + 4..].to_vec())
        .map_err(|_| "sidecar returned a non-UTF-8 body".to_string())?;
    Ok((status, body))
}

fn wait_for_readiness(port: u16, token: &str) -> Result<(), String> {
    let deadline = Instant::now() + READINESS_TIMEOUT;
    while Instant::now() < deadline {
        if let Ok((status, _)) = http_request(port, token, "GET", "/api/v1/health", &[]) {
            if status == 200 {
                return Ok(());
            }
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    Err("sidecar did not become ready before the startup timeout".to_string())
}

#[tauri::command]
fn desktop_request(
    app: AppHandle,
    method: String,
    path: String,
    body: Option<String>,
    state: State<'_, DesktopTransport>,
) -> Result<String, String> {
    let _request_guard = state
        .request_lock
        .lock()
        .map_err(|_| "desktop transport state is unavailable".to_string())?;
    let body = body.unwrap_or_default();
    if body.len() > MAX_JSON_BODY {
        return Err("request body exceeds the desktop transport limit".to_string());
    }
    let port = *state
        .port
        .lock()
        .map_err(|_| "desktop transport port is unavailable".to_string())?;
    let token = state
        .token
        .lock()
        .map_err(|_| "desktop transport token is unavailable".to_string())?
        .clone();
    let (status, response_body) = match http_request(port, &token, &method, &path, body.as_bytes())
    {
        Ok(response) => response,
        Err(first_error) => {
            stop_sidecar(&state);
            let (next_port, next_token, next_child) = start_sidecar(&app).map_err(|restart| {
                format!("desktop request failed: {first_error}; restart failed: {restart}")
            })?;
            *state
                .port
                .lock()
                .map_err(|_| "desktop transport port is unavailable".to_string())? = next_port;
            *state
                .token
                .lock()
                .map_err(|_| "desktop transport token is unavailable".to_string())? =
                next_token.clone();
            *state
                .child
                .lock()
                .map_err(|_| "desktop transport child is unavailable".to_string())? =
                Some(next_child);
            http_request(next_port, &next_token, &method, &path, body.as_bytes())
                .map_err(|error| format!("desktop request failed after restart: {error}"))?
        }
    };
    Ok(format!("{status}\n{response_body}"))
}

fn stop_sidecar(state: &DesktopTransport) {
    if let Ok(mut child) = state.child.lock() {
        if let Some(mut child) = child.take() {
            let _ = child.kill();
        }
    }
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![desktop_request])
        .setup(|app| {
            let (port, token, child) =
                start_sidecar(app.handle()).map_err(std::io::Error::other)?;
            app.manage(DesktopTransport {
                port: Mutex::new(port),
                token: Mutex::new(token),
                child: Mutex::new(Some(child)),
                request_lock: Mutex::new(()),
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building FORGE Org Tool desktop host");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
            if let Some(state) = app_handle.try_state::<DesktopTransport>() {
                stop_sidecar(&state);
            }
        }
    });
}
