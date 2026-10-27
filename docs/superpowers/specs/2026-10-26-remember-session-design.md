# Remember Session Design

## Intent

Let a Supabase user choose whether FORGE restores the authenticated session
after an application restart. Preserve the existing conservative default: a
session survives reloads in the current installation session, but is not
persisted across a new browser/WebView session unless the user explicitly
selects **Remember this session**.

## Scope

- Add a typed `rememberSession` option to the Supabase storage configuration.
- Persist the preference with the already persisted Supabase profile.
- Store the session in `sessionStorage` when disabled and `localStorage` when
  enabled; always clear both stores on sign-out, provider change, or profile
  mismatch.
- Add the checkbox to Settings > Storage and document the behavior.
- Keep passwords, service-role keys, database credentials, and other secrets
  out of storage.

## Non-goals and constraints

- No SQLite, Supabase schema, migration, or remote-data changes.
- No automatic provider fallback or session sharing between profiles.
- No new Tauri/native credential-store dependency in this pass. Persistent
  WebView storage is the current implementation boundary and its shared-device
  risk must be visible in the UI/docs.

## Approaches

1. **Browser/WebView storage mode (selected):** reuse the existing storage
   abstraction and choose `sessionStorage` or `localStorage` from an explicit
   preference. This is the smallest compatible change and works in web and
   Tauri without a second auth bridge.
2. **OS keychain bridge:** store the refresh token through a Tauri command or
   plugin. This is stronger for Desktop but adds a cross-package IPC contract,
   platform-specific tests, and a different browser implementation; it is a
   separate hardening initiative.
3. **Server-side remembered login:** add a backend/session service. Rejected
   because BYOC auth is intentionally React -> api-client -> Supabase and no
   FORGE server should receive the Supabase password or become an auth proxy.

## Success criteria

- The checkbox is accessible and defaults to unchecked for a new profile.
- Checked sessions restore after reload/restart and refresh through the same
  Supabase profile.
- Unchecked sessions restore during the current session but are not read from
  persistent storage after a new session.
- Sign-out, provider changes, and changed project/key profiles cannot reuse an
  old session.
- API-client and Storage Settings tests prove each behavior.
