# Workspace management implementation plan

## Scope

Implement the approved workspace dropdown and management flow on the active
provider without changing SQLite schema or automatically applying Supabase SQL.

## Tasks

1. Add failing tests for the custom workspace menu, management page behavior,
   capability deletion, backend DELETE, and the owner-only Supabase migration.
2. Replace the native workspace select with an accessible custom menu, preserving
   compact mode, active-workspace events, and the Storage menu visual language.
3. Add `/workspaces/manage` with provider-scoped workspace listing, creation,
   settings links, confirmation-gated deletion, and shell refresh events.
4. Extend the API client and local FastAPI capability with `deleteWorkspace`;
   add Supabase RPC routing and an idempotent owner-only 0003 migration plus
   rollback and provisioning documentation.
5. Run focused RED/GREEN checks, full quality checks, package the local Windows
   installer, inspect the diff, and commit only source, tests, docs, and SQL.

## Completion criteria

- The sidebar menu shows `Manage workspaces`, a separator, and workspaces from
  the active provider only.
- Management can create and permanently delete a workspace only after explicit
  confirmation; selecting a workspace immediately updates the shell.
- Local and Supabase paths use the same public capability contract.
- The cloud deletion function is owner-only, not callable by anon/public, and is
  documented as owner-run migration work.
- All relevant tests and the local `.exe` build have fresh evidence.
