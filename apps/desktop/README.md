# Desktop target

The target is Tauri 2 + Rust host, a packaged Python FastAPI sidecar and a
per-user SQLite database. `src/lib.rs` contains the first Rust-owned narrow
request policy: relative `/api/v1` paths only, an explicit method set, and an
8 MiB request cap. It does not expose shell, filesystem, arbitrary HTTP, or
session tokens.

The Tauri host, packaged sidecar, installer, authenticated launch capability,
single-instance lock, and installed Windows smoke remain outstanding. No
legacy desktop bundle is copied.
