# BYOC Supabase provisioning and operation

This guide is for the owner of a Supabase project. FORGE does not create a project, run SQL against a remote project, or receive an administrator credential.

## Provision a disposable project

Use a separate Supabase project for evaluation. Do not point the commands below at a production project unless you have reviewed the migration and made a backup.

1. Create or select the project in Supabase.
2. Save [20261026_byoc_0001.sql](../../supabase/migrations/20261026_byoc_0001.sql) locally.
3. Run that SQL once in the project's SQL editor or through the owner's controlled Supabase CLI workflow.
4. Confirm that the migration completed and that the project exposes the `forge_storage_preflight` and `forge_create_workspace` functions.
5. Create the users who are allowed to use the project through Supabase Auth. Memberships are not client-insertable; the first authenticated user becomes the owner of a workspace created through FORGE. Additional membership administration is intentionally outside BYOC 0.1.

The migration is idempotent for the objects it owns, but it is not a general-purpose upgrade mechanism for an arbitrary existing schema. Do not combine it with unrelated SQL in the same change without reviewing the result.

When no disposable Supabase project is available, the repository's deterministic Auth/Data API fixtures exercise the same client boundary without contacting a provider:

```powershell
npm run build --workspace=@forge-org/api-client
node --test packages/api-client/test/storage.test.mjs packages/api-client/test/supabase.test.mjs
```

Those tests prove request routing and fail-closed behavior; they are not a substitute for the manual project check below.

## Configure FORGE

Open Settings > Storage and select Supabase. Enter only:

- the project URL, such as `https://your-project-ref.supabase.co`;
- the project's `sb_publishable_*` key from the Supabase API settings.

Never enter a secret key, service-role key, database password, connection string, or JWT in the settings form. FORGE stores the profile URL/key as configuration and keeps the authenticated session only for the current session. The password is sent to Supabase Auth and is not saved by FORGE.

After sign-in, use **Refresh connection**. FORGE displays `ready` only after Auth, the `forge-byoc-v1` preflight, and the Data API permission check succeed. A missing schema, denied permission, expired session, or outage remains an actionable error. FORGE does not fall back to local SQLite when Supabase is selected.

## Manual two-installation check

This is the one validation that requires the owner's disposable project and is not represented as a live CI result:

1. Configure installation A and installation B with the same project URL and separate authorized Supabase users.
2. In A, create a Workspace, Project, Epic and Story/Feature.
3. Change the Story/Feature status in A.
4. Refresh B and confirm that the authorized user can see the same records and status.
5. Restart B, sign in again if required, refresh, and confirm persistence.
6. Attempt the same read/update from a user without membership. It must return no data or a permission denial.
7. Delete the disposable project when the check is complete.

Do not use real user data as a smoke fixture and do not claim this test passed without retaining the owner-controlled evidence.

## Rollback and safety

`supabase/rollback/20261026_byoc_0001.sql` drops the BYOC tables, functions and metadata in dependency order. It is destructive. Before running it, confirm that the project contains no data that must remain and export any required data through an owner-controlled process. FORGE never invokes the rollback script.

The local SQLite store is not modified by provisioning or switching to Supabase. There is no automatic data transfer between providers in BYOC 0.1.

## Operational boundaries

The first cloud adapter supports Workspace, Project, Epic, Feature/Story, status changes, planning overview and workspace tags. Tasks, acceptance criteria, dependencies, attachments, transfer, offline sync, realtime and Firebase remain local/future capabilities until their remote contracts and RLS policies are separately implemented.
