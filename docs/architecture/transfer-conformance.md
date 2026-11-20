# Transfer rules: one reference, three implementations

Project import/export and Bug screenshot rules exist in three places because FORGE
supports two storage providers:

| Implementation | Used by                       | Location                                                                       |
| -------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| Python         | Local SQLite provider         | `apps/api/src/forge_org/application/{transfer,attachments,project_package}.py` |
| SQL            | Supabase (owner-run)          | `supabase/migrations/*_byoc_000*.sql`                                          |
| TypeScript     | Supabase client orchestration | `packages/api-client/src/{supabase,images,limits}.ts`                          |

They are not collapsed into one runtime (the BYOC client must not need the local
sidecar), so agreement is enforced by a shared reference instead:

- `contracts/transfer/conformance.json` holds the limits, the image vectors and the `due_date` rule
  (pattern, valid and invalid examples, omit-when-empty).
- `apps/api/tests/test_transfer_conformance.py` checks Python constants, image
  detection and the SQL limits against it.
- `packages/api-client/test/conformance.test.mjs` checks the TypeScript limits and
  `detectImageType` against the same file.

When a rule changes, change the JSON first, then make each implementation pass.
The first run of this check found that the TypeScript client accepted images with
only matching magic bytes while the Python API rejected truncated or malformed
files; the TypeScript detector now applies the same structural checks.

Known remaining difference: the TypeScript file-name check also rejects `..`
inside a name; the Python check does not.

Due dates follow the same discipline. Python validates them with `is_iso_date`, the SQL helper
`forge_is_iso_date` (migration 0007) uses the same pattern, and the TypeScript client passes the
field through unchanged (its test proves package parsing keeps it and never adds it). The SQL is
checked at text level by `test_byoc_due_date_transfer_contract.py`; it is not executed in CI.
