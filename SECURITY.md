# Security boundaries

**Current M1 scope:** minimal browser preview and read-only `/api/v1/health` endpoint. This scaffold is not a production-hardened local service, installable desktop application or authenticated hosted service.

**Target local desktop model:** signed, narrow Tauri IPC; Rust-owned per-launch secret; Python sidecar bound to `127.0.0.1:0`; strict route/method manifest and request limits; no capability or port exposed to React. Localhost is not an authentication mechanism. Do not enable generic shell/filesystem/network IPC.

**Legacy migration:** keep backups outside any Git worktree, never upload the legacy database to a public repo, and test restore on a copy. `FORGE` legacy and `FORGE Org Tool` must use distinct LocalAppData directories.

## Desktop transport guarantees

- The host validates every request against the route and method manifest before it touches the sidecar. A rejected request is reported to the caller and never restarts or replays anything.
- A request is sent again only when it never reached the sidecar or when it is a `GET`. A write that failed after its bytes were sent is not replayed, because the sidecar may already have committed it; the caller gets an explicit "may have been applied, reload before retrying" error. If the sidecar is unhealthy it is restarted either way.
- Sidecar responses are capped in memory (`MAX_RESPONSE_BYTES`), request bodies at `MAX_JSON_BODY`.
- The sidecar authenticates every HTTP request with the per-launch bearer token and refuses WebSocket connections and any other non-HTTP scope instead of skipping the check.
- The webview CSP allows `img-src 'self' blob: data:` only, so Bug screenshots render from object URLs without allowing remote images.

## Accepted risk: remembered Supabase session

When the user chooses "remember session" in BYOC mode, the Supabase session (including the refresh token) is kept in `localStorage`; otherwise it is kept in `sessionStorage`. Any script that runs in the page origin could read it. The mitigations are the strict CSP, no HTML injection sinks in the code base, and the opt-in default. Treat a stolen refresh token as a compromised Supabase user and revoke it from the Supabase dashboard.

Report sensitive issues privately to the repository owner rather than by posting exploit details and secrets in public issues.
