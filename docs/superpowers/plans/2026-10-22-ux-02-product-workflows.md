# UX-02 Product Workflows Implementation Plan

> **For agentic workers:** Execute the tasks in order within each wave. Follow `superpowers:test-driven-development` for behavioral changes. Preserve exclusive file ownership when parallelizing.

**Goal:** Complete end-to-end, navigable, persistent FORGE product workflows across the approved UX-02 scope.

**Architecture:** Reuse ORG-001–009 backend/application contracts and shared UI packages. Feature modules own product compositions; app shell owns cross-feature routes and navigation. Add API/domain behavior only after a contract gap is demonstrated and specified.

**Tech Stack:** React, TypeScript, React Router, CSS Modules, Vitest/Testing Library, Playwright, FastAPI, Pydantic, SQLite, pytest, Tauri/Rust.

**Spec:** `docs/specs/ux-02-product-workflows.md`

## Global Constraints

- Durable state remains API/backend-owned; browser storage is presentation preference only.
- Preserve truth boundaries `REPORTED != OBSERVED != VERIFIED` and `NOT_PUBLISHED`.
- Preserve existing API/OpenAPI, migration, Desktop policy, and supported URL contracts.
- Use synthetic isolated test data; do not touch real databases or original FORGE data.
- No source scanning, arbitrary commands, remotes/network, fake activity, fake readiness, or fabricated Figma records.
- Shared generic UI stays in shared packages; business compositions stay feature-owned.
- Do not merge PR #1, publish packages, archive original FORGE, or modify canonical Figma.

## Review Focus

- Workspace with zero projects: show recovery/create actions without invented metrics.
- Concurrently changing or stale route context: keep selected workspace/project and breadcrumbs coherent.
- Append-only activity/revision histories: prevent edits that rewrite prior records.
- Unsupported/blocked verification: explain exact state without promoting report to proof.
- Import preview changed after review: reject stale fingerprint and preserve planning-only semantics.

---

## Wave A — Workspace, Planning, Navigation

### Task A1: Workspace Home truthful dashboard

**Files:** `apps/web/src/features/organization/**`, focused feature tests; backend/API only if a read model is proven necessary.

- [ ] Add failing tests for populated workspace/project summaries, search/filter, empty/loading/error/recovery, and truthful attention/activity.
- [ ] Run tests to confirm they fail for missing behavior.
- [ ] Compose current persisted records and supported rules; specify/test any necessary API read model before implementation.
- [ ] Verify feature tests, typecheck, and browser route with isolated records.

### Task A2: Planning hierarchy and transitions

**Files:** `apps/web/src/features/planning/**`, focused planning tests; API contract only for a demonstrated missing operation.

- [ ] Add failing tests for epic selection, feature CRUD/detail, task/criteria/dependency editing, manual transition, filtering, breadcrumbs, and readiness navigation.
- [ ] Verify RED, implement with existing planning API and feature-owned components, then verify GREEN/regressions.
- [ ] Preserve manual state semantics; test invalid/cyclic dependencies and error recovery.

### Task A3: Cross-feature shell/navigation foundation

**Files:** `apps/web/src/app/App.tsx`, shell-owned modules/tests and routes; Playwright journey specs.

- [ ] Add route/navigation tests for supported URLs, active context, keyboard access, responsive menu, search/commands, and unknown/error recovery.
- [ ] Integrate feature public APIs without deep cross-feature imports.
- [ ] Run route tests and first real Organization→Planning→Readiness browser path.

## Wave B — Runs, Handoffs, Repositories, Context

### Task B1: Runs and handoff lifecycle

**Files:** `apps/web/src/features/workbench/**`, existing run API only if contracts suffice; focused tests.

- [ ] RED tests for run detail, chronological events, human event creation, handoff draft/edit/validation/ready/queue/review/acknowledgement/history/downloads.
- [ ] Implement through existing append-only and immutable backend operations; no agent execution claims.
- [ ] Verify lifecycle, revision immutability, errors, and downloaded JSON/Markdown contents.

### Task B2: Repository and context-package lifecycle

**Files:** `apps/web/src/features/repositories/**`, `apps/web/src/features/context/**`, focused tests.

- [ ] RED tests for guided local connect, unavailable/recovery, details, bounded observation/history, feature association, preview/save/history/download.
- [ ] Use existing read-only metadata observer and immutable package operations; never read source contents.
- [ ] Verify permissions/errors, persistence, provenance, filenames/content, and repository-free states.

## Wave C — Evidence, Verification, Delivery, Transfer

### Task C1: Evidence and verification center

**Files:** `apps/web/src/features/delivery/**`, API additions only if necessary and contract-tested.

- [ ] RED tests for evidence inventory/detail/provenance/status/invalidation, rule selection/configuration/preview/evaluation/result trace, candidate revisions/gates/manifest download.
- [ ] Implement only supported deterministic domain rules and persisted operations.
- [ ] Verify reported/observed/verified distinctions, blocked explanations, and `NOT_PUBLISHED` invariants.

### Task C2: Guided project import/export

**Files:** `apps/web/src/features/transfer/**`, transfer API only if existing contract is insufficient.

- [ ] RED tests for select/validate/preview/fingerprint/reviewed commit, changed-fingerprint rejection, duplicate/cycle/limit errors, and export download.
- [ ] Implement guided steps and genuine file download, retaining explicit advanced input only if already supported.
- [ ] Verify schema/version, new identifiers, and planning-only import semantics.

## Wave D — Integration and E2E

### Task D1: Full journeys, accessibility, responsive themes

**Files:** `apps/web/e2e/**` and focused feature regressions/screenshots.

- [ ] Add isolated browser journeys for Organization→Planning→Readiness; Run→Activity→Handoff→Acknowledge; Repository→Observation→Context package; Evidence→Verification→Candidate; Import and Export.
- [ ] Verify actual persisted state after reload, errors/recovery, keyboard/focus, long text, scroll/overflow, and nav state.
- [ ] Capture loaded product routes at 1440/1280/1024/390/375px and Dark/Light where applicable; rename/correct `desktop-planning.png` and retain `desktop-readiness.png` separately.

### Task D2: API/Desktop compatibility

**Files:** API and Desktop only where new operations require changes, their OpenAPI/route policy and tests.

- [ ] For each API delta, add contract tests and verify OpenAPI output before integration.
- [ ] Verify restricted Tauri transport only exposes approved routes; no broader process/filesystem capability.
- [ ] Run API, migration, Desktop Rust/build/smoke checks using isolated synthetic data.

## Wave E — Review and Certification

### Task E1: Full quality verification and independent review

- [ ] Run Prettier, zero-warning ESLint, TypeScript, package builds/consumer, architecture, component/API contracts, OpenAPI, Ruff/mypy, backend/migration, Chromium E2E, production build/host exclusion, Desktop checks, and GitHub Quality CI.
- [ ] Request an independent read-only review of the integrated changes; fix only substantiated in-scope issues with regression tests.
- [ ] Update functional parity and UX-02 verification with exact commit, CI run, screenshots, automated-vs-human evidence, Figma differences, and genuine blockers.
- [ ] Report `UX_02_READY_FOR_EXTERNAL_REVIEW` only if every definition-of-done item is evidenced; otherwise report exact blockers and continue the active Goal.

## Execution Notes

Commit this specification and plan before implementation. Use native subagents only on disjoint feature-owned write sets; coordinator retains shell/routing, shared contracts, API schema, E2E integration, verification, and final review. Integrate waves sequentially and do not wait on unrelated completed work. Every behavioral change follows RED→GREEN→REFACTOR; existing structural moves need no artificial failing tests.
