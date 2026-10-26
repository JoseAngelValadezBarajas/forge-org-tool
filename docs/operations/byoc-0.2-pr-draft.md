# Draft PR — FORGE BYOC 0.2 hardening

## Summary

Extends the owner-managed Supabase adapter from the BYOC 0.1 vertical slice to
the active SQLite planning and transfer contract. React continues to call the
stable `organizationApi`; local requests remain React → api-client → FastAPI →
SQLite, while cloud requests are React → api-client → Supabase Auth/Data
API/private Storage. No PostgreSQL connection or privileged key is distributed.

## Included

- Incremental `20261026_byoc_0002.sql` and destructive owner-reviewed rollback.
- Tasks, acceptance criteria, dependencies, atomic reorder and cycle checks.
- Composite project ownership constraints, archived-project guards, RLS,
  owner-controlled membership and private `forge-bug-attachments` Storage.
- JSON v1/v2, contextual JSON v2 and ZIP v2 adapter paths with checksum,
  bounded parsing, staging and compensation.
- Supabase adapter tests, migration contract checks, private content handling,
  reload/session coverage, and documentation/parity register.
- Bounded streaming ZIP extraction that rejects oversized declared expansion
  before allocation.
- Contextual fingerprints bound to scope, workspace, project and destination.
- Storage read-back verification for image signature, size and SHA-256 before
  metadata insertion, plus a database trigger check for Storage metadata.
- Import compensation is bound to a non-client-writable, same-user provisional
  import session and exact Project. Finalized imports cannot be deleted.
- `feature_dependencies` direct INSERT/UPDATE writes are protected by a
  PostgreSQL cycle trigger and Project-row lock, including concurrent writers.

## Verification

See [`byoc-0.2-verification.md`](byoc-0.2-verification.md). Local automated
checks pass; no claim is made for a real Supabase project until the owner runs
the documented disposable A/B/C test.

## Review notes

- `20261026_byoc_0001.sql` is intentionally unchanged.
- `20261026_byoc_0002.sql` is the owner-reviewed incremental migration and was
  not executed by FORGE; it needs no adjustment before disposable-project
  validation.
- The untracked operator `build/` directory was preserved.
- Do not merge or apply either migration to a real project without owner
  backup/review.
