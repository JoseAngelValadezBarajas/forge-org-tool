# FORGE BYOC 0.2 functional parity

**Status:** implementation candidate on `feature/forge-byoc-supabase-parity`.

## Runtime contract

BYOC cloud requests use exactly this boundary:

```text
React -> @forge-org/api-client -> Supabase Auth / Data API / private Storage
```

The local provider remains:

```text
React -> @forge-org/api-client -> FastAPI -> SQLite
```

FastAPI remains dedicated to local SQLite. A Supabase URL is never passed to
`FORGE_DATABASE_PATH`, and the installed application never opens PostgreSQL
directly. The `organizationApi` compatibility facade is shared by both
providers.

## Parity surface

The Supabase adapter covers the active SQLite planning and transfer contract:

- Workspace, Project, Epic and Story/Bug create/update/archive/restore/status;
- planning overview, workspace tags, tasks, acceptance criteria and reorder;
- dependency create/list/delete with same-project and cycle rejection;
- private Bug screenshot metadata and bytes in `forge-bug-attachments`;
- complete JSON v1/v2 and contextual JSON v2 transfer; and
- complete ZIP v2 transfer with staged private attachments.

Critical invariants are database-owned: membership and role RLS, composite
project ownership foreign keys, archived-project write guards, unique names,
dependency graph validation and transaction boundaries. Client validation is
only an early error message and never an authorization boundary.

## Migration boundary

`supabase/migrations/20261026_byoc_0001.sql` is the already-applied BYOC 0.1
baseline and is immutable. Owners apply
`20261026_byoc_0002.sql` explicitly, after backup/review, to add the parity
tables, private bucket, RLS, grants and RPCs. FORGE does not run either file,
does not provision a project, and does not receive an owner/service-role key.

The preflight response is `forge-byoc-v2`. An installation never reports
Supabase `ready` before authentication, version preflight and permission
checks succeed. A failed cloud operation never falls back to SQLite.

## Real-project boundary

CI uses synthetic HTTP and contract fixtures, and runs a disposable Postgres
test only when the local Supabase/Docker prerequisites are available. The
owner-controlled A/B/C run in
[`docs/operations/byoc-supabase.md`](../operations/byoc-supabase.md) is the
only evidence that can certify a real project and two installations.
