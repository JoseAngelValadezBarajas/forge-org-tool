# Desktop target

The target is Tauri 2 + Rust host, a packaged Python FastAPI sidecar and a
per-user SQLite database. `src/lib.rs` contains the first Rust-owned narrow
request policy: relative `/api/v1` paths only, an explicit method set, and an
8 MiB request cap. `sidecar_launcher.py` owns per-launch token generation,
loopback binding, LocalAppData database/log paths, and process cleanup. The
React app receives neither the token nor the process handle.

The Tauri host bundles a Python sidecar executable supplied at build time by
`package_sidecar.ps1`. The launcher uses a per-launch bearer token, waits for an
authenticated health response, and stores the database, logs, and backups under
the current user's `LocalAppData\\ForgeOrgTool` tree. Packaged and installed
smoke tests use a disposable `LocalAppData` directory; no legacy desktop bundle
or real user database is copied.

`src-tauri` contains the pinned Tauri 2 host and a minimal `core:default`
capability manifest. Bundling is enabled for the authenticated sidecar. The
installed Windows smoke verifies synthetic fresh-install isolation, restart
persistence, and upgrade migration behavior before release review.
