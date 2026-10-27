# BYOC 0.2 verification record

Branch: `feature/forge-byoc-0.2-hardening` from `origin/main` at `aa4430e3`.

GitHub Quality run: `40384008635` — API, Web and Desktop all passed.

This record covers the focused BYOC 0.2 hardening pass. `origin/main` was
fetched and confirmed to contain `aa4430e3`; no force push, revert, merge or
automatic migration execution was performed.

## Hardening evidence

- ZIP entries are streamed through a bounded extractor. Declared expansion is
  rejected before allocation and observed output is capped at 25 MiB.
- Contextual transfer fingerprints include scope, workspace, project,
  destination and document in the server RPC.
- Complete-project imports use a same-user, exact-project, 15-minute
  provisional import session. JSON and successful ZIP imports finalize the
  session; compensation rejects existing projects, mismatched users/projects,
  expired sessions and finalized imports.
- Direct `feature_dependencies` INSERT/UPDATE paths use a PostgreSQL trigger
  with a Project-row lock and recursive reachability check, including
  concurrent writers; the RPC check remains as an early error path.
- Screenshot upload and import read the private Storage object back before
  metadata insertion. Reads verify image signature, byte size and SHA-256;
  the migration trigger checks object existence and Storage size/MIME metadata.
- `supabase/migrations/20261026_byoc_0001.sql` is unchanged. The incremental
  `20261026_byoc_0002.sql` contains the hardening and remains owner-run only;
  it was not executed automatically and requires no pre-application edit.

## Automated evidence executed locally

- `npm test`: PASS — architecture, generated OpenAPI types, typecheck, 42
  architecture/tooling tests, 170 Vitest tests with 8 intentional skips, and
  29 api-client package contract tests plus 4 package-boundary tests.
- `uv run --project apps/api --locked pytest`: PASS — 84 tests.
- `uv run --project apps/api --locked mypy apps/api/src`: PASS — 60 source files.
- `npm run lint:frontend`: PASS.
- `npm run lint:python`: PASS.
- `npm run format:check:web`: PASS; Ruff formatting check: PASS.
- `npm run check:architecture`: PASS.
- `npm run build`: PASS, including production Component Host exclusion.
- `npm run test:e2e:full`: PASS — 34 Chromium desktop/mobile tests, 10
  repository-declared skips.
- `npm run test:e2e:smoke`: PASS — 2 isolated Chromium Component Host tests.
- `npm run check:api-types`: PASS.

The focused hardening tests include 20 api-client adapter tests and 6 migration
contract tests, including negative JSON/ZIP compensation, direct dependency
cycle-guard, ZIP decompression, and Storage metadata mismatch cases.

The focused migration contract tests are synthetic/static because no local
Supabase CLI or running Docker engine was available on the verification host.
They assert the incremental migration, tables, composite foreign keys, RLS,
private bucket, RPC names, cycle guard and owner membership action.

## Not claimed as passed

- A live Supabase/Postgres RLS run was not executed. No user credentials or
  project were accessed. The owner must run the disposable-project A/B/C
  procedure in [`byoc-supabase.md`](byoc-supabase.md).
- Local Rust commands were not executable because `cargo` is not installed on
  this Windows verification host; the same checks and Desktop packaging passed
  in GitHub Quality run `40384008635`.

These are environment/live-project limitations, not silent substitutes for
the missing evidence. GitHub Quality run `40384008635` passed Web smoke,
visual/package/full checks and Desktop rustfmt, Clippy, Rust tests, release
build and installed acceptance.
