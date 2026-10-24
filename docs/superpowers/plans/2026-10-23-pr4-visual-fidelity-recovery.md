# PR #4 Visual Fidelity Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ten FORGE Org Tool 1.1 screens materially faithful to their exact Figma references while preserving all interactive product behavior and recording non-acceptance until human review.

**Architecture:** Keep React feature ownership and semantic tokens. Make visual-reference states deterministic through the existing isolated Playwright/SQLite fixture, retain controls that are absent from Figma behind legitimate secondary interactions, and make visual tooling distinguish measured evidence from human acceptance.

**Tech Stack:** React, TypeScript, CSS Modules, `@corefoundry-labs/forge-ui`, FastAPI/SQLite fixtures, Playwright, pixelmatch, Tauri/NSIS.

**Spec:** `C:\Users\josea\.codex\attachments\fabd0b1a-94ed-4d42-8c21-0594c7ca8cff\Pasted text.txt`

## Global Constraints

- Use Figma file `r10szKLgiIPVi2NBmbjTpm` and the ten listed node IDs as read-only specifications.
- Never hide business behavior, accessibility controls, or security checks merely to improve a screenshot.
- Keep reference images immutable; fresh actual, diff, overlay, report, and geometry evidence use isolated SQLite-backed fixtures.
- Do not auto-mark human visual review accepted, merge, release, alter Figma, or modify user data.
- Preserve Component Host production exclusion, JSON/ZIP compatibility, local-first SQLite persistence, and all MVP 1.0 journeys.

## Review Focus

- Imported contextual JSON must retain atomic preview and fingerprint confirmation while the default visual state remains compact.
- Mobile move/status access must persist through the API and remain usable by keyboard and screen readers despite being visually secondary.
- Fixture counts and satisfied criteria must come from persisted API responses, including after reload.
- Workspace tag metadata must be truthful; unavailable usage counts cannot be fabricated for screenshots.
- Visual tool reports must reject structural geometry regressions and cannot self-accept nonzero image differences.

---

### Task 1: Establish exact visual contracts and evidence guardrails

**Files:**
- Modify: `apps/web/evidence/ux11-capture.spec.ts`
- Modify: `tooling/scripts/figma-visual-diff.mjs`
- Modify: `tooling/scripts/run-ux11-visual.mjs`
- Create: `tooling/scripts/figma-visual-diff.test.mjs`
- Modify: `docs/evidence/ux-1.1/README.md`

**Interfaces:**
- Produces: per-screen geometry JSON with reference, actual, deviations and structural verdict; reports whose status remains `VISUAL_FIDELITY_NOT_ACCEPTED` absent a human approval record.

- [ ] Write failing tool tests for structural geometry rejection and human-review gate behavior.
- [ ] Run `node --test tooling/scripts/figma-visual-diff.test.mjs` and observe the expected failures.
- [ ] Implement report schema, geometry checks for all ten screens, and explicit human-review gate without baseline rewriting.
- [ ] Run the focused tool tests and `npm run test:e2e:ux11-visual` to regenerate evidence.
- [ ] Commit evidence tooling changes.

### Task 2: Recompose contextual Transfer and workspace tags

**Files:**
- Modify: `apps/web/src/features/transfer/TransferPage.tsx`
- Modify: `apps/web/src/features/transfer/TransferPage.module.css`
- Modify: `apps/web/src/features/transfer/TransferPage.test.tsx`
- Modify: `apps/web/src/features/organization/WorkspaceSettingsPage.tsx`
- Modify: `apps/web/src/features/organization/WorkspaceSettingsPage.module.css`
- Modify: `apps/web/src/features/organization/WorkspaceSettingsPage.test.tsx`
- Modify: `apps/web/evidence/ux11-capture.spec.ts`

**Interfaces:**
- Consumes: contextual preview import controller, `WorkspaceTag` API values, evidence fixture seed data.
- Produces: reference-state two-panel Transfer and Tags compositions without fabricated production metadata.

- [ ] Write failing component tests for compact contextual preview/security disclosure and tags card action ordering.
- [ ] Run focused Vitest tests and observe expected failures.
- [ ] Implement semantic source/drop-zone, compact preview/count panel, secondary disclosures, truthful tag cards/guidance and contextual controls.
- [ ] Run focused Vitest tests plus desktop/mobile transfer and settings Playwright evidence.
- [ ] Commit Transfer/Tags changes.

### Task 3: Align mobile Epic Board and detail/drawer reference states

**Files:**
- Modify: `apps/web/src/features/planning/EpicDetailPage.tsx`
- Modify: `apps/web/src/features/planning/EpicDetailPage.module.css`
- Modify: `apps/web/src/features/planning/EpicDetailPage.test.tsx`
- Modify: `apps/web/src/features/planning/FeatureDetailPage.tsx`
- Modify: `apps/web/src/features/planning/FeatureDetailPage.module.css`
- Modify: `apps/web/src/features/planning/FeatureDetailPage.test.tsx`
- Modify: `apps/web/src/features/planning/CreateEpicDrawer.tsx`
- Modify: `apps/web/src/features/planning/CreateEpicDrawer.module.css`
- Modify: `apps/web/src/features/planning/CreateEpicDrawer.test.tsx`
- Modify: `apps/web/evidence/ux11-capture.spec.ts`

**Interfaces:**
- Consumes: Planning API status update and feature/criterion persistence APIs.
- Produces: fixed 390px default layout, persisted status move alternate interaction, fixture-backed 2/3 criteria state, and non-scrolling Drawer focus behavior.

- [ ] Write failing tests for mobile secondary status actions, persisted two-of-three criteria, and Drawer initial-title visibility.
- [ ] Run focused tests and observe expected failures.
- [ ] Implement reference-state mobile cards/tabs/navigation and contextual alternate controls; tune detail and Drawer internals without changing drawer bounds.
- [ ] Run focused Vitest plus mobile/desktop Playwright journeys and visual capture.
- [ ] Commit mobile/detail/drawer changes.

### Task 4: Finish remaining desktop frame deltas and certification records

**Files:**
- Modify: `apps/web/src/features/organization/OrganizationPage.tsx` and `.module.css` if measured evidence requires it
- Modify: `apps/web/src/features/planning/PlanningPage.tsx` and `.module.css` if measured evidence requires it
- Modify: `apps/web/src/features/planning/FeatureDetailPage.tsx` and `.module.css` for Bug detail if measured evidence requires it
- Modify: `apps/web/evidence/ux11-capture.spec.ts`
- Modify: `docs/evidence/ux-1.1/README.md`

**Interfaces:**
- Consumes: exact Figma screenshot/context, existing board geometry contracts, isolated fixture content.
- Produces: revised evidence and a ten-row verification table with state, measured geometry and human-review status.

- [ ] Add failing geometry/content assertions for each remaining frame delta.
- [ ] Run those assertions and observe expected failures.
- [ ] Apply scoped typography, card-internal, token, filter and vertical-alignment corrections; retain five-column dimensions and responsive behavior.
- [ ] Run visual capture and all focused browser/component suites.
- [ ] Commit remaining visual and evidence changes.

### Task 5: Integrate and certify the branch

**Files:**
- Modify: `docs/evidence/ux-1.1/README.md`
- Modify: PR #4 body

- [ ] Run Prettier, frontend lint, typecheck, Vitest, pytest, all Playwright desktop/mobile and visual capture, production build/component-host exclusion, and available native checks.
- [ ] Push cohesive commits to `feature/forge-ux-1.1`; inspect the same-SHA GitHub Quality API/Web/Desktop results and Windows artifact.
- [ ] Update PR #4 with all ten reference/actual/diff reports, root causes, measured geometry, `HUMAN_REVIEW_PENDING`/`BLOCKED` state and CI links.
- [ ] Request human Figma signoff; keep `VISUAL_FIDELITY_NOT_ACCEPTED` and `NOT_READY_FOR_MERGE` until it is supplied.
