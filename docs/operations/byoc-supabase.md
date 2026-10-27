# BYOC Supabase provisioning and operation

This guide is for the owner of a Supabase project. FORGE does not create a project, run SQL against a remote project, or receive an administrator credential.

## Provision a disposable project

Use a separate Supabase project for evaluation. Do not point the commands below at a production project unless you have reviewed the migration and made a backup.

1. Create or select the project in Supabase.
2. Take an owner-controlled backup/export, review the files, then apply [20261026_byoc_0001.sql](../../supabase/migrations/20261026_byoc_0001.sql), [20261026_byoc_0002.sql](../../supabase/migrations/20261026_byoc_0002.sql), and, if workspace deletion is required, [20261026_byoc_0003.sql](../../supabase/migrations/20261026_byoc_0003.sql) through the owner's reviewed SQL editor or controlled Supabase CLI workflow. FORGE never applies these files.
3. Confirm that `forge_storage_preflight()` returns `forge-byoc-v2`, the private `forge-bug-attachments` bucket exists, and the transfer/planning RPCs exist.
4. Create the Supabase Auth identity used for the two-installation check. The first authenticated user becomes the owner of a workspace created through FORGE. Migration 0003 is optional for existing projects until an owner needs permanent workspace deletion; without it, the UI reports the provider's unavailable RPC instead of falling back to SQLite.

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

Never enter a secret key, service-role key, database password, connection string, or JWT in the settings form. FORGE stores the profile URL/key as configuration and keeps the authenticated session in session storage by default. The optional **Remember this session** setting persists the profile-bound session in the WebView so FORGE can restore it after restart; use it only on a private device and sign out on shared devices. The password is sent to Supabase Auth and is not saved by FORGE.

After sign-in, use **Refresh connection**. FORGE displays `ready` only after Auth, the `forge-byoc-v2` preflight, and the Data API permission check succeed. A missing schema, denied permission, expired session, or outage remains an actionable error. FORGE does not fall back to local SQLite when Supabase is selected.

## Manual two-installation check

This is the one validation that requires the owner's disposable project and is not represented as a live CI result:

1. Configure installation A and installation B with the same project URL and the same authorized Supabase identity. Sign in with that identity in both installations; this is the intended shared-data check, not two separate users.
2. In A, create a Workspace, Project, Epic, Story/Bug, Task and Acceptance Criterion; add a dependency and a screenshot; then export/import a synthetic project JSON/ZIP fixture.
3. Change work item status and reorder Tasks/criteria in A.
4. Refresh B and confirm that the same authorized identity sees the same records, attachment metadata/content, ordering and status without a local SQLite request.
5. Restart B, sign in again if required, refresh, and confirm persistence and that the private screenshot is not publicly readable.
6. Sign in to a separate Supabase Auth identity C that has no `workspace_members` row. Its reads must return no workspace data or a permission denial, and its writes must not change A/B data.
7. Delete the disposable project when the check is complete.

## Controlled owner membership setup

Testing a second authorized identity is a separate owner action. The client must not grant membership to itself or expose a membership-management capability in BYOC 0.2.

After confirming the target workspace UUID and the second user's Supabase Auth UUID in the owner's dashboard, the owner may run this reviewed SQL in the disposable project's SQL editor. This is separate from the A/B same-identity check:

```sql
begin;
select public.forge_owner_add_member('<workspace-uuid>', '<user-uuid>', 'viewer');
commit;
```

The owner must verify both UUIDs before executing it, retain the result as validation evidence, and remove the membership afterward if it is no longer needed. This action is not part of application startup, is never performed by FORGE, and must not be run against production or operator data.

Do not use real user data as a smoke fixture and do not claim this test passed without retaining the owner-controlled evidence.

## Rollback and safety

`supabase/rollback/20261026_byoc_0002.sql` is the owner-only rollback for the incremental 0.2 objects and policies; it is destructive for 0.2 planning/attachment data. The 0.1 rollback remains separate. Before running either script, confirm that the project contains no data that must remain and export any required data through an owner-controlled process. FORGE never invokes a rollback script.

The local SQLite store is not modified by provisioning or switching to Supabase. There is no automatic data transfer between providers in BYOC 0.2; transfer is an explicit reviewed import/export action.

Workspace management lists only the active provider. Permanent deletion requires
explicit confirmation. Local deletion uses the local API and SQLite foreign-key
cascades. Supabase deletion is an owner-only `forge_delete_workspace` RPC from
0003; it removes the workspace's private attachment objects before the related
metadata and project records cascade. It is never available to anonymous users,
editors, viewers, or the installed application before the owner applies 0003.

Migration 0002 creates the private `forge_import_sessions` table and the
database-owned `feature_dependencies_acyclic_guard`. Do not insert or update
import-session rows manually. A complete-project import creates a provisional
session only inside the protected transfer function; it is bound to the
authenticated creator and exact Project, expires after 15 minutes, and is
finalized after successful import. Compensation cannot delete an existing or
finalized Project. Direct dependency table writes are checked by PostgreSQL and
concurrent mutations for one Project are serialized by its Project-row lock.

Before applying 0002, verify that 0001 is the expected baseline, retain the
backup, run the complete 0002 file without editing or splitting it, and confirm
the `forge-byoc-v2` preflight. If rollback is required, stop the client, export
any data that must be retained, and use the reviewed rollback script; FORGE does
not invoke rollback or migration SQL.

## Operational boundaries

The cloud adapter supports the active planning and transfer contract. Offline sync, realtime and Firebase remain out of scope.
