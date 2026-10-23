# Complete Reconstruction and Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the authorized ORG-008 desktop product and close the remaining ORG-009 presentation, evidence, migration, and CI gaps without changing verified behavior or touching real user data.

**Architecture:** Preserve the existing FastAPI/domain repository contracts while moving schema ownership to explicit versioned migration modules and adding compatibility checks for synthetic databases. Wire the existing Tauri host and Python sidecar into a packaged, isolated Windows lifecycle, then align the React shell and representative pages through existing shared components. Keep browser evidence disposable, uniquely named, and executed in CI with `reuseExistingServer: false`.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy/Alembic migration tooling, SQLite, React 19, TypeScript, Vite, Playwright Chromium, Tauri 2, Rust.

**Spec:** `docs/specs/ORG-008-desktop/spec.md`, `docs/specs/ORG-009-web-surfaces/spec.md`, and the authorized continuation brief supplied on 2026-10-20.

## Global Constraints

- Never read, migrate, overwrite, or package a real FORGE database; all migration and installer tests use disposable synthetic paths.
- Preserve ORG-001 through ORG-007 APIs, deterministic rules, immutable snapshots, provenance boundaries, and existing tests.
- Keep `/__components` development-only and use actual shared production components.
- Keep the desktop sidecar loopback-only, per-launch authenticated, and outside the React trust boundary.
- Do not claim human Figma parity certification; retain reviewed differences as evidence.
- Do not archive the original Forge repository or change global Figma variables.

## Review Focus

- Existing synthetic schema version 1 must upgrade without losing representative records; migration tests pin this to the API database layer.
- A fresh install and a restart must use an isolated LocalAppData tree and preserve only the synthetic database; desktop smoke tests pin this to the launcher.
- A sidecar that exits before readiness must fail closed; launcher tests pin this to the startup path.
- Desktop and mobile screenshots must have distinct paths and dimensions; Playwright tests pin this to project configuration and evidence output.
- CI must run the isolated browser journey without attaching to an unrelated process; the workflow pins the server and disposable database settings.

### Task 1: Versioned persistence transition

**Files:**
- Create: `apps/api/src/forge_org/infrastructure/migrations/versions/0001_initial.py`
- Create: `apps/api/src/forge_org/infrastructure/migrations/versions/0002_metadata.py`
- Create: `apps/api/tests/test_migrations.py`
- Modify: `apps/api/pyproject.toml`, `apps/api/uv.lock`, `apps/api/src/forge_org/infrastructure/sqlite.py`

- [ ] Write failing fresh-schema and v1-upgrade tests using temporary databases and representative workspace/project rows.
- [ ] Run the focused migration tests and observe the expected missing migration behavior.
- [ ] Implement version discovery, atomic migration execution, `PRAGMA user_version`/migration ledger checks, and compatibility with the existing repository methods; reject unknown future versions without modifying the database.
- [ ] Run focused and full API tests, Ruff, mypy, and OpenAPI checks.
- [ ] Commit the persistence transition.

### Task 2: Installed desktop lifecycle and packaging

**Files:**
- Create: `apps/desktop/tests/test_installed_smoke.py`
- Create: `apps/desktop/package_sidecar.ps1`
- Modify: `apps/desktop/sidecar_launcher.py`, `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/README.md`, `.github/workflows/quality.yml`

- [ ] Write failing tests for fresh isolated install, restart persistence, backup/recovery, and failed sidecar startup.
- [ ] Run the focused desktop tests and observe failures for the missing packaged lifecycle.
- [ ] Implement a packaged sidecar command contract, explicit readiness/shutdown handling, installer-safe LocalAppData directories, and synthetic install smoke helpers.
- [ ] Configure Tauri bundling only for the packaged sidecar and keep credentials/process handles out of React.
- [ ] Run Python desktop tests and Windows CI packaging/smoke checks.
- [ ] Commit the desktop lifecycle slice.

### Task 3: Application shell and page hierarchy alignment

**Files:**
- Modify: `apps/web/src/app/App.tsx`, `apps/web/src/app/App.module.css`, `apps/web/src/app/global.css`
- Modify: `apps/web/src/features/organization/OrganizationPage.tsx`, `apps/web/src/features/organization/OrganizationPage.module.css`
- Modify: `apps/web/src/features/delivery/DeliveryPage.tsx`, `apps/web/src/features/delivery/DeliveryPage.module.css`
- Modify: `apps/web/src/app/App.test.tsx`, page tests, and `apps/web/e2e/m1-browser.spec.ts`

- [ ] Add failing contract tests for stable shell navigation, workspace/project summaries, and delivery hierarchy without sample-data substitution.
- [ ] Run focused tests to confirm the missing composition.
- [ ] Implement the hierarchy with existing Card, SectionHeader, Button, StatusChip, and token styles; preserve all API actions and responsive behavior.
- [ ] Run the full frontend unit suite and isolated browser journey.
- [ ] Commit the UI alignment slice.

### Task 4: Evidence isolation and CI browser acceptance

**Files:**
- Modify: `apps/web/playwright.config.ts`, `apps/web/e2e/m1-browser.spec.ts`, `.github/workflows/quality.yml`
- Create/rename: unique desktop/mobile evidence files under `docs/evidence/m1/`
- Modify: `docs/evidence/m1/verification.md`, `docs/reconstruction/progress.md`

- [ ] Add failing assertions for unique project-specific screenshot paths and desktop/mobile viewport metadata.
- [ ] Run the focused Playwright configuration checks and observe the filename collision.
- [ ] Implement unique screenshot naming and CI execution against a disposable API database with `reuseExistingServer: false`.
- [ ] Run isolated Chromium locally and in GitHub Quality CI; retain screenshots without baseline regeneration.
- [ ] Commit the evidence/CI slice.

### Task 5: Component Host and final certification records

**Files:**
- Modify: `apps/web/src/app/component-gallery/ComponentGallery.tsx`, related CSS/tests
- Modify: `docs/design/component-parity.md`, `docs/evidence/m1/verification.md`, `docs/specs/M1-foundation/traceability.md`, ORG-008/009 acceptance records, `docs/reconstruction/functional-parity.md`

- [ ] Add failing component contract/accessibility tests for any changed previews.
- [ ] Implement only representative previews of actual production components and retain dark/light evidence.
- [ ] Run typecheck, architecture checks, focused tests, full frontend/API/desktop suites, production build, isolated Chromium, and CI.
- [ ] Record automated verification separately from human-reviewed Figma parity and list remaining genuine differences.
- [ ] Commit final records and report `RECONSTRUCTION_READY_FOR_FINAL_REVIEW` only if every authorized gate has fresh evidence.

## Self-Review

- Spec coverage: Tasks 1–2 cover persistence, packaging, migration, isolation, restart, and recovery; Tasks 3–5 cover hierarchy, responsive behavior, component host, screenshots, CI, and certification records.
- Type consistency: migration entry points remain behind `connect()` and preserve all existing repository call sites; UI changes use existing component exports.
- Review focus: each of the five failure modes is pinned to a named test/configuration task.
- Proportion: the plan identifies interfaces and evidence gates without prescribing implementation details that the existing codebase already determines.
