# Workspace selector and management design

## Intent

Make the sidebar workspace control behave like the existing Storage provider
menu. Users should see workspaces from the currently active provider, switch
between them, and reach one management screen where they can create, inspect,
open settings for, or permanently delete a workspace.

## Goals and constraints

- Keep local SQLite and Supabase data isolated; never merge provider lists.
- Preserve the existing workspace selection event and routing behavior.
- Use an accessible custom menu with keyboard navigation and a compact sidebar
  presentation.
- Delete local workspaces through the existing API boundary and delete cloud
  workspaces only through an owner-only Supabase RPC introduced by a manual,
  incremental migration.
- Require explicit confirmation before destructive deletion and leave archived
  workspaces visible.
- Do not apply SQL to a remote project or change the existing BYOC migrations.

## Approaches considered

1. Keep the native `<select>` and add a separate settings link. This would not
   match the Storage interaction or support the requested management action in
   the same control.
2. Add a custom menu in the shell and a dedicated management page backed by the
   existing capability client. This is the selected approach because it keeps
   navigation concerns in the shell, workspace CRUD in the capability boundary,
   and feature-specific management UI out of `App.tsx`.
3. Merge local and Supabase workspaces into one list. Rejected because IDs and
   data ownership are provider-scoped and the storage switch must remain an
   explicit boundary.

## Implementation decisions

- `WorkspaceSwitcher` owns menu interaction and emits `onManage`; `App` owns
  navigation, active selection, and provider refresh state.
- `WorkspaceManagementPage` loads the active provider, creates workspaces, and
  confirms permanent deletion. It links existing per-workspace settings rather
  than duplicating tag/profile management.
- `organizationApi.deleteWorkspace` is implemented for local HTTP DELETE and
  Supabase RPC `forge_delete_workspace`.
- Local deletion is a real transactional delete with SQLite foreign-key
  cascades. Cloud deletion is owner-only and must be enabled by the owner-run
  0003 migration; the application never runs that SQL automatically.

## Verification

Focused tests cover menu selection/management navigation, management CRUD and
confirmation, local deletion, Supabase RPC routing, and the migration contract.
The existing frontend, API-client, backend, build, and desktop packaging checks
remain part of final verification.
