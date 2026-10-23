# Full Product Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally executable, deterministic acceptance system that exercises implemented FORGE user journeys, records all canonical Figma frames honestly, and preserves Windows installed-app certification boundaries.

**Architecture:** Keep Playwright and the existing FastAPI/SQLite foundation. Add portable isolated fixtures and root scripts; organize independent capability suites; aggregate per-capability coverage shards into a machine-readable registry and human report. Keep native Desktop acceptance as a distinct Windows-only lane.

**Tech Stack:** Playwright, TypeScript, Vitest, FastAPI, SQLite, Tauri 2, GitHub Actions.

**Spec:** Approved requirements in the user-provided Full Product Acceptance & Playwright E2E request (2026-10-22); canonical Figma file `r10szKLgiIPVi2NBmbjTpm`.

## Global Constraints

- Preserve the existing Chromium smoke and UX-02 journeys, assertions, disposable SQLite state, and controlled servers.
- Never reuse an arbitrary existing server; collisions fail with a clear isolation error.
- Use portable temporary paths; no Codex-session or `.superpowers/sdd` fixture dependency.
- Exercise real API + disposable SQLite for functional journeys; mock only deliberate failure conditions.
- Do not invent product behavior absent from the implementation; classify it as a product gap or reference.
- Do not touch operator data, real SQLite data, Figma masters, or original FORGE.
- Browser tests do not certify the installed Tauri host; keep native GUI assertions Windows-specific.
- Do not claim human Figma certification or 100% coverage without corresponding reviewed evidence.

## Review Focus

- A busy configured port must fail safely without attaching to another process; test occupied web and API ports.
- Failed or interrupted imports must leave no partial records; verify database state after every rejected document class.
- Timeouts, API unavailable, stale state, and retry paths must present useful user-facing recovery, not just HTTP assertions.
- Theme/viewport changes and long user-controlled strings must not conceal horizontal overflow or inaccessible controls.
- Desktop smoke must verify native window, rendered React UI, authenticated IPC/API, restart persistence, and sidecar cleanup separately from browser tests.

## File Map

- `apps/web/playwright.config.ts`: isolated server and database allocation, suites/projects, artifacts.
- `apps/web/e2e/fixtures/`, `helpers/`, and capability folders: reusable deterministic setup and readable journeys.
- `apps/desktop/tests/`: installed Windows journeys only.
- `package.json`, `.github/workflows/`: developer commands and CI lanes.
- `docs/quality/product-acceptance/`: per-domain machine-readable Figma coverage shards; aggregate registry and report at `docs/quality/product-acceptance-matrix.md` and `docs/quality/product-acceptance-registry.json`.
- `docs/evidence/product-acceptance/`: deterministic screenshots and retained evidence references.

---

### Task 1: Portable isolated Playwright foundation and local commands

**Files:**
- Modify: `apps/web/playwright.config.ts`, root `package.json`, `apps/web/package.json` as needed.
- Create: `apps/web/e2e/fixtures/`, `apps/web/e2e/helpers/`, local acceptance runner scripts and focused tests for configuration/cleanup.
- Test: existing E2E smoke and a controlled occupied-port regression.

**Interfaces:**
- Tests consume one run-scoped temporary directory, unique SQLite file, synthetic authorized repository root, and owned web/API servers.
- Commands: `npm run test:e2e:smoke`, `npm run test:e2e:full`, `npm run test:e2e:visual`, `npm run test:acceptance:local`; a separate Windows Desktop acceptance command.

- [ ] Write regression checks for Codex-path independence, collision failure without reuse, isolated fixture paths, and owned-process cleanup.
- [ ] Run them and confirm they fail against the current hard-coded fixture path where applicable.
- [ ] Implement portable temporary fixtures, collision-safe unique ports and centralized scripts without weakening `reuseExistingServer: false`.
- [ ] Run smoke and existing suites; retain failure artifacts.

### Task 2: Organization, planning, decisions, invariants, readiness

**Files:**
- Create: `apps/web/e2e/organization/`, `planning/`, `readiness/` tests and `docs/quality/product-acceptance/organization-planning-readiness.json`.
- Modify production feature code only for reproduced defects, with a regression test first.

**Interfaces:**
- Consume Task 1 fixture and helper contract.
- Cover workspace/project CRUD and recovery; Epics, Features, Tasks, ordering, criteria, dependencies and board transitions; decisions/history, invariants and revision-aware readiness.

- [ ] Add happy-path, validation, recovery and persistence tests for implemented flows.
- [ ] Verify each new test fails for the intended missing behavior before a product fix.
- [ ] Classify every applicable Figma frame and map it to a route, action, expected result, test/evidence, and honest status.
- [ ] Run focused tests and document unimplemented designs instead of fabricating functionality.

### Task 3: Repositories, context, runs and handoffs

**Files:**
- Create: `apps/web/e2e/repositories/`, `context/`, `workbench/` tests and `docs/quality/product-acceptance/repositories-context-workbench.json`.
- Modify production feature code only for reproduced defects, with a regression test first.

**Interfaces:**
- Consume Task 1 fixture contract, including synthetic repository authorization.
- Cover repository path authorization/connectivity; context previews, immutable snapshots and downloads; run/event chronology; handoff revisions, review and acknowledgement.

- [ ] Add successful user-visible journeys and meaningful invalid, missing, stale and retry paths.
- [ ] Assert persisted database state for writes and rejected actions.
- [ ] Classify every applicable Figma frame and link exact test/evidence IDs.
- [ ] Run focused tests and document product gaps accurately.

### Task 4: Evidence, delivery, transfer and installed Windows Desktop

**Files:**
- Create: `apps/web/e2e/delivery/`, `transfer/`, `desktop/` tests and `docs/quality/product-acceptance/delivery-transfer-desktop.json`.
- Modify: `apps/desktop/tests/` and Windows workflow only where native acceptance can be executed and validated.
- Modify production code only for reproduced defects, test-first.

**Interfaces:**
- Consume Task 1 fixture contract. Browser transfer validates real download bytes and SQLite effects. Installed Desktop tests remain a separate Windows UI Automation lane.

- [ ] Cover evidence provenance/invalidation, checks and traces, release-candidate gates/freeze/manifests and `NOT_PUBLISHED` semantics.
- [ ] Exercise export-download-import-preview-confirm with schema, fingerprint, duplicate, malformed and cyclic-dependency rejection; prove no partial writes.
- [ ] Extend installed GUI acceptance for IPC, authenticated sidecar, workspace/project persistence, restart, import/export, single instance and cleanup where supported.
- [ ] Run browser-focused and Windows-native suites separately and record unavailable runner capabilities as blockers.

### Task 5: Navigation, accessibility, visual and responsive acceptance

**Files:**
- Create: `apps/web/e2e/navigation/`, `accessibility/`, `visual/` tests and their coverage shard.
- Modify: `apps/web/e2e/m1-browser.spec.ts`, `ux02-workflows.spec.ts` only to preserve and integrate existing assertions/evidence.

**Interfaces:**
- Consume shared fixture contract; representative viewport matrix: 1440, 1280, 1024, 390, 375; Dark and Light; System where supported.

- [ ] Test routes, context, sidebar, breadcrumbs, command palette, browser history, keyboard navigation, unknown routes, themes and mobile navigation.
- [ ] Exercise accessible names, keyboard interactions, focus management, dialogs, tabs, validation/status announcements and measurable contrast.
- [ ] Capture deterministic actual-app screenshots and classify comparisons as automated evidence, not human Figma certification.
- [ ] Verify overflow, touch/form/dialog/table behavior on representative screens without multiplying every scenario by every viewport.

### Task 6: Figma coverage registry, reports, CI and final integration

**Files:**
- Create/update `docs/quality/product-acceptance-matrix.md`, `docs/quality/product-acceptance-registry.json`, registry validation tooling/tests, and focused GitHub Actions jobs.
- Update `CONTRIBUTING.md` and developer documentation with real commands.

**Interfaces:**
- Aggregate all domain shards with schema validation, unique Figma IDs, valid status values, test IDs and evidence references.
- Coverage statuses: `AUTOMATED_PASS`, `AUTOMATED_FAIL`, `NOT_IMPLEMENTED_PRODUCT_GAP`, `DESIGN_REFERENCE_ONLY`, `MANUAL_REVIEW_REQUIRED`, `BLOCKED_WITH_REASON`.

- [ ] Include every top-level frame on active pages 04, 10, 12, 14, 16, 17 and 18; the live metadata currently enumerates 115 frames (reconcile against the stated approximate 116).
- [ ] Run the complete deterministic acceptance suite locally and in the appropriate CI lane; keep smoke as the fast first gate and native GUI on Windows.
- [ ] Run existing frontend, API, architecture, package, production build and relevant Desktop checks.
- [ ] Generate the final matrix from actual executed evidence, record all product gaps/defects/blockers, and verify no false pass claims.
