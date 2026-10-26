# FORGE BYOC 0.1

**Status:** superseded by [BYOC 0.2](byoc-0.2.md). This document records the 0.1 trust-boundary decisions that remain in force.

## Product contract

Settings > Storage lets a user choose:

- **Local SQLite** — the existing per-installation sidecar and database path; selected by default.
- **Supabase** — an HTTPS Data API connection to a project owned and provisioned by the user.

Changing provider never copies, merges, migrates, deletes, or silently falls back between stores. Existing local data is left in place. A cloud operation that fails is reported as a cloud error; it is never retried against local SQLite.

The 0.1 cloud slice was intentionally limited. BYOC 0.2 extends it to tasks, acceptance criteria, dependencies, private attachments and versioned transfer; offline sync, realtime and Firebase remain out of scope.

## Runtime layers and trust boundaries

```text
React UI
  -> @forge-org/api-client
  -> Supabase Auth and HTTPS Data API
  -> the user's PostgreSQL constraints, functions and RLS

React UI
  -> @forge-org/api-client local transport
  -> FastAPI sidecar
  -> local SQLite
```

The client accepts only a hosted HTTPS URL of the form `https://<project-ref>.supabase.co` and an `sb_publishable_*` key. It rejects secret/service-role keys, PostgreSQL passwords, URLs with userinfo/ports/paths, and arbitrary hosts. The publishable key identifies the project; it is not an authorization grant. Authorization comes from the signed-in user's JWT and the project's RLS policies.

The existing FastAPI sidecar remains dedicated to SQLite local storage. `FORGE_DATABASE_PATH` is a filesystem path and is never interpreted as a PostgreSQL or Supabase URL. Cloud requests use the narrow browser API-client adapter, so the installed application never opens a direct PostgreSQL connection and never receives an admin credential. React-side validation improves UX; critical invariants, authorization, project ownership relationships, and cross-workspace isolation are enforced by PostgreSQL constraints and RLS.

## Client lifecycle

The API client exposes a stable `organizationApi` facade while its transport can be switched explicitly to the Supabase adapter:

1. Local startup initializes the existing same-origin transport and reports `ready`.
2. Selecting Supabase validates and persists only the project URL and publishable key. No request is made until the user saves the configuration.
3. Sign-in uses Supabase Auth password grant. The grant is sent as the `/auth/v1/token` query parameter and only credentials are sent in the JSON body. The password is not persisted. By default the access/refresh session is kept in profile-bound session storage; **Remember this session** explicitly moves it to persistent WebView storage for restarts. Both modes restore only for the same project/key profile, and sign-out/provider changes clear both storage layers. Expired sessions are refreshed once and failed refreshes require sign-in again.
4. `inspectStorage()` calls `forge_storage_preflight()` with the user's JWT. The 0.1 baseline reports `forge-byoc-v1`; the incremental 0.2 migration reports `forge-byoc-v2`.
5. `401`, `403`, missing/unsupported schema, and network failures become distinct UI states. No state is reported as ready before authentication, schema, and permission preflight succeeds.

The desktop CSP allows HTTPS connections to `*.supabase.co` in addition to the existing local sidecar origin. Tauri window, sidecar, and filesystem policies are otherwise unchanged.

## Owner-run database boundary

The owner applies [20261026_byoc_0001.sql](../../supabase/migrations/20261026_byoc_0001.sql) explicitly in their own Supabase project. It creates the first cloud schema, indexes, foreign keys, checks, RLS policies, the schema preflight function, and the security-definer workspace-creation function. The client never runs migrations or provisions a project.

All exposed tables have RLS enabled. Membership insertion is not granted to the client; the workspace creation function inserts the authenticated caller as owner. Project, epic, feature, tag reads and writes are membership-bound, and update policies include both `USING` and `WITH CHECK` predicates to prevent moving a row across workspaces. A composite foreign key prevents a feature from referencing an epic owned by another project. The rollback script is intentionally destructive and is for an owner who has confirmed that the BYOC objects can be removed; it is not part of application startup.

## Verification boundary

Automated coverage includes strict profile validation, exact Auth grant/body routing, same-profile reload restoration and changed-profile invalidation, auth/schema/permission lifecycle, no-local-fallback behavior, Data API request routing for the vertical slice, RLS denial propagation, UI onboarding, the cross-project feature/epic negative contract, SQL/RLS contract checks, and Tauri CSP contract checks.

No live Supabase project or credential is included in this repository. Therefore this change must not claim a real two-installation sync certification. The remaining manual validation is one owner-controlled run: provision a disposable Supabase project with the migration, configure installations A and B with the same authorized identity, create the vertical slice in A, refresh B, and verify status-change and restart persistence; then verify user C has no membership access. Any additional authorized user must be prepared separately through the documented owner-controlled membership action. The owner must then delete that disposable project if it is no longer needed.

## Historical 0.1 follow-ups

- Add a secure OS-backed token store where the target platform exposes one; persistent WebView storage is the current remember-session boundary and should be treated as unsafe on shared devices.
- The former 0.1 follow-up is implemented by the incremental 0.2 migration and parity adapter.
- Define explicit export/import or migration UX before offering any data movement between local and cloud stores.
- Consider realtime/offline conflict handling only as a separate design; BYOC 0.1 is online and refresh-based.
