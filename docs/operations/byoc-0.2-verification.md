# BYOC 0.2 verification record

Branch: `feature/forge-byoc-supabase-parity` from `origin/main`.

## Automated evidence executed locally

- `npm test`: PASS — architecture, generated OpenAPI types, typecheck, 42
  architecture/tooling tests, 170 Vitest tests with 8 intentional skips, and
  24 api-client Supabase contract tests.
- `uv run --project apps/api --locked pytest`: PASS — 81 tests.
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

The focused migration contract tests are synthetic/static because no local
Supabase CLI or running Docker engine was available on the verification host.
They assert the incremental migration, tables, composite foreign keys, RLS,
private bucket, RPC names, cycle guard and owner membership action.

## Not claimed as passed

- A live Supabase/Postgres RLS run was not executed. No user credentials or
  project were accessed. The owner must run the disposable-project A/B/C
  procedure in [`byoc-supabase.md`](byoc-supabase.md).
- Rust `cargo fmt`, Clippy and Desktop packaging were not executable because
  `cargo` is not installed on this Windows verification host. Existing Python
  Desktop tests passed as part of the API pytest run.

These are environment/live-project limitations, not silent substitutes for
the missing evidence.
