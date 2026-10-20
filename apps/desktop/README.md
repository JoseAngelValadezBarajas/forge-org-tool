# Desktop target

The target is Tauri 2 + Rust host, a packaged Python FastAPI sidecar and a
per-user SQLite database. `src/lib.rs` contains the first Rust-owned narrow
request policy: relative `/api/v1` paths only, an explicit method set, and an
8 MiB request cap. `sidecar_launcher.py` owns per-launch token generation,
loopback binding, LocalAppData database/log paths, and process cleanup. The
React app receives neither the token nor the process handle.

The Tauri host, packaged sidecar/installer, single-instance lock, and installed
Windows smoke remain outstanding. The Rust policy and Python launch/security
contracts are implemented but native compilation is not currently certified.
No legacy desktop bundle is copied.

`src-tauri` contains the pinned Tauri 2 host skeleton and a minimal
`core:default` capability manifest. Bundling is intentionally disabled until
the authenticated sidecar is wired into the native lifecycle and an installed
Windows smoke can verify persistence and isolation.
