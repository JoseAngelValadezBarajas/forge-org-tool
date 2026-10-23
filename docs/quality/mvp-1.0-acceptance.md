# FORGE Org Tool 1.0 Acceptance Traceability

Every criterion is verified with automated behavior/API evidence. Screenshots are browser layout evidence; they are not human visual certification against Figma.

| AC | Required behavior | Primary automated evidence | Status |
|---|---|---|---|
| 1 | Workspace and Project CRUD, archive/restore, real active selector, reload persistence | API organization tests; Organization Playwright journey | Pending 1.0 implementation |
| 2 | Epic Project Board with priority, tags and progress | Planning API/component tests; Project Board journey | Pending 1.0 implementation |
| 3 | Epic Board persists Stories/Bugs and retains legacy Feature compatibility | Planning API and migration tests; Epic Board journey | Pending 1.0 implementation |
| 4 | Acceptance Criteria CRUD/reorder, safe notes, stable workspace-scoped normalized tags | API transaction and isolation tests; planning UI journey | Pending 1.0 implementation |
| 5 | Structured Bug fields and safe bounded PNG/JPEG/WebP attachments | API validation/security tests; desktop persistence journey | Pending 1.0 implementation |
| 6 | Five persisted statuses, drag interaction and accessible selector; archive separate | API status tests; keyboard/mouse Playwright journey | Pending 1.0 implementation |
| 7 | State survives web/API/Desktop restart through SQLite; no production seeding | API persistence tests; installed Desktop restart journey | Pending 1.0 implementation |
| 8 | v2 transfer, v1 compatibility, one validator, atomicity, refs/tags/fingerprint and secure ZIP fixtures | Transfer API contract/security suite; round-trip fixtures | Pending 1.0 implementation |
| 9 | Development-only `/__components`; only in-scope shared/product previews | Host behavior and production-build exclusion tests | Pending 1.0 implementation |

## Baseline at implementation start

- Commit: `d0f111022bc570eb5b25e9fb16c21b7a216b862f` (`origin/main`).
- `npm ci`: passed; 388 packages added, audit reported 0 vulnerabilities. npm emitted a deprecation notice for the existing pinned ESLint version.
- `npm test`: passed on baseline (architecture/design-system/token/type checks; 60 frontend test files / 186 tests; shared token/UI/icon and API-client package checks; external-consumer package test).
- `uv run --project apps/api --locked pytest -q`: passed (33 tests, 1 subtest); one existing Starlette `httpx` deprecation warning.
- Local Rust toolchain: `cargo` not found; Rust formatting/Clippy/native builds require a configured runner or CI.

## Reporting rules

Do not change `Pending` to automated pass without named tests and retained results. Record browser dimensions, theme and screenshot paths separately. Record Figma mapping as `IMPLEMENTED_NOT_REVIEWED` unless a human reviewer inspected the exact referenced nodes and evidence. A green installer build is not native GUI acceptance; GUI acceptance requires visible window and UI/API/SQLite/restart evidence.
