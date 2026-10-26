# FORGE BYOC 0.2 functional parity

**Status:** hardening candidate on `feature/forge-byoc-0.2-hardening`.

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

Transfer fingerprints for contextual imports are bound to the scope, workspace,
project, destination and document by the contextual RPC. A reviewed fingerprint
cannot be replayed against another destination. ZIP parsing enforces the 5 MiB
compressed, 25 MiB expanded and 100-entry limits while streaming entries before
allocating declared payload sizes.

Complete-project imports create a private, short-lived import session in the
same transaction as the generated Project. JSON imports finalize it immediately
after the client receives the commit response; ZIP imports finalize it only
after attachment staging succeeds. Compensation requires the same user's
provisional session, exact workspace and Project, and an unexpired session.
Finalized or expired imports cannot be deleted through the compensation RPC.

Dependency cycle protection is database-owned. A trigger protects direct table
INSERT/UPDATE paths as well as the RPC, locks the Project row before checking
reachability, and serializes concurrent dependency mutations for that Project.

Screenshot writes use private Storage, read the stored object back, validate its
image signature, byte size and SHA-256 against the metadata, and only then write
the `bug_attachments` row. The migration trigger also checks that the Storage
object exists and that its declared size and MIME metadata agree with the row.

## Migration boundary

`supabase/migrations/20261026_byoc_0001.sql` is the already-applied BYOC 0.1
baseline and is immutable. Owners apply
`20261026_byoc_0002.sql` explicitly, after backup/review, to add the parity
tables, private bucket, RLS, grants and RPCs. FORGE does not run either file,
does not provision a project, and does not receive an owner/service-role key.
The hardening changes are included in 0002; no adjustment to 0001 is required.
The owner should still validate the final SQL in a disposable project before
applying it to any retained project.

The preflight response is `forge-byoc-v2`. An installation never reports
Supabase `ready` before authentication, version preflight and permission
checks succeed. A failed cloud operation never falls back to SQLite.

## Real-project boundary

CI uses synthetic HTTP and contract fixtures, and runs a disposable Postgres
test only when the local Supabase/Docker prerequisites are available. The
owner-controlled A/B/C run in
[`docs/operations/byoc-supabase.md`](../operations/byoc-supabase.md) is the
only evidence that can certify a real project and two installations.
