# ORG-008 acceptance

- [x] Define a Rust-owned relative API request policy with method and body caps.
- [x] Require a per-launch bearer token for the loopback sidecar.
- [x] Define LocalAppData database/log paths and sidecar process cleanup.
- [x] Add pinned Tauri host and restrictive capability/WebView configuration.
- [x] Add authenticated per-launch sidecar startup and shutdown ownership policy.
- [x] Add LocalAppData database/log/backup paths.
- [x] Verify Rust/Tauri host compilation and desktop launcher tests in GitHub Quality CI.
- [x] Verify versioned fresh/v1-upgrade/future-version migration behavior and persistence across restart in synthetic isolated smoke.
- [x] Build the packaged PyInstaller sidecar and validate authenticated readiness without exposing the token to React/CLI arguments.
- [ ] Human-certify migration safety in the installed product.
- [ ] Build and run a human-reviewed installed Windows smoke with persistence and isolation.
