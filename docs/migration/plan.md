# FORGE Org Tool 1.0 Migration and Preservation Plan

## Migration policy

- Migrations are forward-only. Never rewrite shared database history or silently downgrade.
- Check `user_version` and migration ledger before writes; reject unsupported future versions without mutation.
- Before the first schema mutation of an existing database, use SQLite's online backup API to create a consistent per-user backup, run `PRAGMA integrity_check` on it, and record source/backup identifiers and schema version in a local manifest. If backup or verification fails, abort migration.
- Preserve every existing table and row, including retired advanced capabilities. Do not drop inactive tables or cascade-delete their data during 1.0 migration.
- Fresh databases create only active 1.0 entities plus migration metadata; legacy tables are not created by default.
- Apply each migration atomically where SQLite allows; use idempotent migration IDs and test interrupted startup/replay.
- Tests use isolated temporary SQLite files. Never point migration tests or tooling at operator data.

## Compatibility matrix

| Data area | 1.0 handling |
|---|---|
| Workspaces and Projects | Active and preserved; add active workspace preference without changing project ownership or archive semantics. |
| Epics and Features | Active Planning; retain existing Features as readable work items while enabling Story/Bug types. |
| Tasks, criteria and dependencies | Active and preserved, including stable IDs, order and project scope. |
| Decisions and Invariants | Legacy rows/tables retained, no active API/UI. |
| Readiness evaluations | Legacy rows/tables retained, no active API/UI. |
| Repositories and Git observations | Legacy rows/tables retained; remove active connection/observation surfaces. |
| Context Packages | Legacy rows/tables retained; remove active context package UI/API. |
| Runs and Handoffs | Legacy rows/tables retained; no active workbench surfaces. |
| Evidence, Verification, Candidates, Gates, Manifests | Legacy rows/tables retained; no active delivery/release governance. |
| Project Transfer | Active; read supported v1 payloads and support v2 export/import with atomic validation. |
| Bug attachments and tags | Active 1.0 additions; bounded, workspace-scoped, safely staged and restart-persistent. |

## Rollback and recovery

Do not reverse migrations or overwrite the live database with a backup automatically. On failure, leave the source unchanged when possible, report the verified backup location to the local operator, and require deliberate recovery. Test restore only against a separate disposable copy. User-facing app data and backups never enter source control, CI artifacts, or issue attachments.

## Test gates

Test fresh schema inventory, migration from every supported baseline, preservation of legacy rows and fingerprints, SQLite integrity of the backup, interruption/retry, replay safety, future-version rejection, foreign-key integrity, and ORG-001–007 behavior. Transfer and attachment data additionally require checksum, path traversal, size-bound and atomicity tests.
