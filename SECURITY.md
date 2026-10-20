# Security boundaries

**Current M1 scope:** minimal browser preview and read-only `/api/v1/health` endpoint. This scaffold is not a production-hardened local service, installable desktop application or authenticated hosted service.

**Target local desktop model:** signed, narrow Tauri IPC; Rust-owned per-launch secret; Python sidecar bound to `127.0.0.1:0`; strict route/method manifest and request limits; no capability or port exposed to React. Localhost is not an authentication mechanism. Do not enable generic shell/filesystem/network IPC.

**Legacy migration:** keep backups outside any Git worktree, never upload the legacy database to a public repo, and test restore on a copy. `FORGE` legacy and `FORGE Org Tool` must use distinct LocalAppData directories.

Report sensitive issues privately to the repository owner rather than by posting exploit details and secrets in public issues.
