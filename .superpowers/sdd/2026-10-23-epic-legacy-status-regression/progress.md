# SDD ledger — plan: docs/superpowers/plans/2026-10-23-epic-legacy-status-regression.md

- Task 1: complete — legacy schema HTTP reproduction observed `ResponseValidationError` at `response.status`; input `planning`; POST response 500; persisted row had status `planning`.
- Task 2: complete — migration v5 tested directly for mapping, valid/unknown-state preservation, archive metadata, record identity/count and repeatability; upgraded-schema backup integrity and replay tested. Added migration lock after Playwright exposed overlapping initial migration and `sqlite3.OperationalError: database is locked`; concurrency regression test observed RED (8 overlapping migrations) → GREEN (one migration at a time).
- Task 3: complete — HTTP create regression RED (500) → GREEN (201/backlog); invalid-tag create returned 422 and left no Epic/tag rows.
- Task 4: complete — Planning page regression RED (legacy Epic absent) → GREEN; detail regression RED (unsupported status fell back to backlog) → GREEN; project summary test added.
- Task 5: in progress — NSIS smoke path inspected and confirmed isolated; upgraded legacy Chromium acceptance passed and screenshot retained; full E2E rerun pending after migration serialization fix.
- Task 6: pending — final verification, commit, push, PR update.

Ruling: Add in-process serialization around SQLite backup/migration during connection opening — two full browser acceptance runs produced SQLite lock failures under concurrent initial API requests, and an 8-thread regression test confirmed migration overlap; the lock preserves migration behavior while serializing connection initialization. Cost if wrong: connection opening throughput is lower while migration checks run.
