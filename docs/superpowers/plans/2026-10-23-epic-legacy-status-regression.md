# Epic Legacy Status Regression Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair Epic creation against upgraded legacy SQLite databases and keep every existing Epic accessible in API and UI.

**Architecture:** Reproduce with a real temporary SQLite database whose Epic status default is `planning`, upgraded through the production migration runner. Add a forward-only, backup-protected schema migration, explicitly insert the canonical create status, and relax only persisted response status typing so unsupported records remain retrievable and visible in a recovery section. Extend existing frontend acceptance using a separately initialized upgraded database fixture; keep installed smoke data isolated.

**Tech Stack:** Python 3.12, SQLite, FastAPI, pytest, TypeScript, React, Playwright, npm workspaces.

**Spec:** User request “FORGE Org Tool 1.0: Fix Epic HTTP 500 and Invisible Legacy Epics”.

## Global Constraints

- Preserve every stored Epic; do not delete or recreate records or deduplicate prior failed requests.
- Migrate only `planning` → `backlog` and `planned` → `ready`; preserve valid statuses and archived metadata/behavior.
- Create an integrity-checked backup before forward migration using the existing backup mechanism.
- Smoke and browser tests must use disposable synthetic databases, not installed user data.
- Keep existing HTTP behavior and board interactions for valid workflow states.
- Do not claim CI or visual evidence without the corresponding run/review.

## Review Focus

- Existing Epic status default survives old schema creation; prove POST no longer relies on it.
- Migration must be repeatable and preserve row identities, archives, and non-target statuses.
- Unknown stored Epic state must remain serializable, visible, and distinguishable from workflow columns.
- Failed create must roll back Epic and tag records as one transaction.
- Browser acceptance must begin from an upgraded legacy fixture and observe immediate card/count updates.

---

### Task 1: Reproduce legacy-schema POST failure

**Files:** Test `apps/api/tests/test_planning.py`; test fixture helper in `apps/api/tests/` if needed.

**Interfaces:** Use `create_app()`, `TestClient`, and the production `connect()` migration path.

- [x] Build a disposable version-2 database fixture with `epics.status DEFAULT 'planning'`, legacy Epics, and a valid workspace/project.
- [x] Upgrade through the normal connection/migration path and POST a new Epic; assert the expected baseline failure and inspect the complete exception traceback plus persisted row.
- [x] Verify the baseline failure is FastAPI response-model validation caused by `planning`, with the Epic already persisted.

### Task 2: Normalize Epic statuses in a new migration

**Files:** Create `apps/api/src/forge_org/infrastructure/migrations/v0005_epic_status_normalization.py`; modify migration runner; test `apps/api/tests/test_migrations.py`.

**Interfaces:** Migration module exports `VERSION = 5` and `upgrade(connection)`; runner advances current schema to 5.

- [x] Test old defaults, target status remapping, valid status preservation, archive metadata preservation, record identity/count, repeatability, and backup creation before implementation.
- [x] Run focused tests to observe RED.
- [x] Implement idempotent UPDATE-only migration and register version 5.
- [x] Serialize backup/migration while opening SQLite connections; a concurrent first-open E2E failure reproduced `sqlite3.OperationalError: database is locked` during schema inspection.
- [x] Verify migration tests GREEN and existing migration compatibility.

### Task 3: Make create and API failure atomic

**Files:** Modify `apps/api/src/forge_org/infrastructure/persistence/organization_planning.py`; Epic API schemas; tests in `apps/api/tests/test_planning.py`.

**Interfaces:** Keep `PlanningService.create_epic`/HTTP endpoint public contract; persisted Epic response can carry an unknown legacy status as text while mutation inputs remain the five-state workflow enum.

- [x] Add HTTP POST regression asserting 201, returned/database `backlog`, overview inclusion, and rollback/no Epic or orphan tags when a create fails.
- [x] Confirm RED against baseline.
- [x] Explicitly insert status `backlog`; preserve transaction rollback; widen only response status and keep update/create input validation constrained.
- [x] Run focused API tests GREEN.

### Task 4: Make all Epics visible and counts reconcilable

**Files:** Modify `apps/web/src/features/planning/PlanningPage.tsx`, EpicCard as needed, `packages/api-client/src/types.ts`, relevant unit tests, and project overview tests if needed.

**Interfaces:** Keep five known workflow columns; render unarchived unsupported states under a named legacy/recovery region with the stored state clearly shown. Keep archived Epics under Archived Epics. Project summary count remains total persisted Epic count and includes all categories.

- [x] Add failing component tests for unknown-status and archived Epic visibility/count reconciliation.
- [x] Run targeted tests RED.
- [x] Implement the smallest accessible recovery section and tolerant read type while preserving status mutation options for known states.
- [x] Run focused web tests/typecheck GREEN.

### Task 5: Upgraded-database browser acceptance and smoke isolation

**Files:** Modify `apps/web/e2e/planning/planning-workflows.spec.ts`, Playwright fixture/server setup only if required, and `apps/desktop/tests/test_installed_smoke.py` only if isolation gap is found.

**Interfaces:** Use a temporary fixture DB initialized from the legacy default schema and upgraded by the app; browser tests assert UI state without reloading.

- [x] Add acceptance for existing legacy/archived/unsupported synthetic Epics and newly created Epic in Backlog; assert summary count against visible categories.
- [x] Run Playwright and verify immediate card appearance after submit.
- [ ] Trace “Installed Bug smoke” test data path; assert all installed smoke writes stay under a temporary LOCALAPPDATA root and never interact with operator data. Preserve existing records.

### Task 6: Certification, commit, and PR #3 update

**Files:** Update relevant verification record and PR #3.

- [x] Run pytest, frontend typecheck/tests, Playwright, production build, and affected API/schema checks; GitHub Quality CI remains pending push.
- [x] Review diff, migration backup behavior, and synthetic affected-record counts.
- [ ] Commit on `feature/forge-mvp-1.0`, push to PR #3 without merging, and update PR with evidence and SHA.
- [ ] Confirm PR remains open/unmerged and report exact verification outcomes.
