# Shared Packages and Component Architecture Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing shared packages the reusable foundation for implemented FORGE screens while preserving public API compatibility and ORG-001–007 behavior.

**Architecture:** Expand `@corefoundry-labs/forge-ui` only with controls and compositions that have current feature consumers, then refactor those consumers while keeping business behavior in feature-owned components. Split `@forge-org/api-client` into transport, errors, types, and capability modules while preserving the `organizationApi` facade. Do not create icons or testing packages until licensed assets or genuinely shared test utilities have real consumers.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Playwright, Vite, FastAPI OpenAPI export, npm workspaces.

**Spec:** Approved user brief: “FORGE Org Tool · Shared Packages & Component Architecture Completion”.

## Global Constraints

- Generic controls belong in `@corefoundry-labs/forge-ui`; business-specific compositions remain feature-owned.
- Preserve accessibility, interactions, existing business behavior, API contracts, and responsive layouts.
- Preserve the current public `organizationApi` export during the transition.
- Use Figma page 19 for shared UI contracts and page 20 for feature-owned product patterns.
- Do not claim human visual certification without external review.
- Do not create empty packages, speculative abstractions, or arbitrary components to satisfy inventory counts.
- Do not weaken existing tests, alter real user data, merge PR #1, archive original FORGE, or interfere with ORG-008 Desktop certification.

## Review Focus

- Native form semantics: shared controls must forward labels, names, values, refs, disabled state, and native attributes.
- Controlled and uncontrolled inputs: extracted controls must preserve React value/defaultValue and change-event behavior.
- Keyboard/focus behavior: tabs, dialogs, search, and buttons must retain keyboard access and focus-visible styling.
- API failure behavior: centralized errors must preserve backend detail messages and 204 handling.
- OpenAPI drift: client types and paths must remain checked against the authoritative backend export.

---

### Task 1: Shared UI contracts and justified primitives

**Files:**
- Create: `packages/ui/src/primitives/Select.tsx`, `Textarea.tsx`, `Checkbox.tsx`, `FormField.tsx`, `SearchField.tsx`
- Create: `packages/ui/src/components/MetricCard.tsx`, `Badge.tsx`, `Alert.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `ErrorState.tsx`, `Progress.tsx`
- Modify: `packages/ui/src/index.ts`, shared component CSS files, `apps/web/src/ui-contracts.test.tsx`
- Test: focused public-contract tests in `apps/web/src/ui-contracts.test.tsx` or package-local tests following the existing convention

**Interfaces:**
- Consumes: existing token CSS, `Button`, `Card`, `Input`, `SectionHeader`, and React native attribute types.
- Produces: typed public exports with ref forwarding where native elements support refs; `FormField` composes label/help/error semantics without owning domain validation.

- [ ] Write failing tests for native attribute/ref forwarding, `Select`/`Textarea`/`Checkbox` controlled behavior, `SearchField` search semantics, and state/composition accessibility.
- [ ] Run the focused UI tests and confirm they fail because the exports/components do not yet exist.
- [ ] Implement the minimal typed components with semantic tokens and no feature/API imports.
- [ ] Run focused tests and the package architecture checks; confirm they pass.
- [ ] Commit `feat: expand reusable ui contracts`.

### Task 2: Shared component adoption across feature consumers

**Files:**
- Modify: `apps/web/src/features/{organization,planning,readiness,repositories,workbench,delivery,transfer}/*.tsx`
- Create or modify: `apps/web/src/features/*/components/` only for business-specific compositions extracted from oversized pages
- Modify: feature CSS and focused feature tests as required

**Interfaces:**
- Consumes: Task 1 public exports.
- Produces: existing flows using shared generic controls; feature-owned compositions remain under their feature directories.

- [ ] Add or adapt focused tests proving the existing organization, planning, readiness, repositories, workbench, delivery, and transfer flows retain their accessible labels, values, submissions, filters, and truth-state copy.
- [ ] Run affected tests before implementation and confirm the adoption assertions fail or expose the current duplicated markup.
- [ ] Replace applicable native duplicated controls/layouts with shared exports; extract only domain-specific repeated compositions into feature-owned components.
- [ ] Run affected Vitest tests and the full frontend test suite; confirm behavior and responsive class contracts remain green.
- [ ] Commit `refactor: adopt shared ui across features`.

### Task 3: API client modularization and contract validation

**Files:**
- Create: `packages/api-client/src/transport.ts`, `errors.ts`, `types.ts`, `organization.ts`, `planning.ts`, `readiness.ts`, `repositories.ts`, `workbench.ts`, `delivery.ts`, `transfer.ts`
- Modify: `packages/api-client/src/index.ts`, package metadata, API-client tests, and frontend imports only where needed
- Test: API-client contract tests covering error details, 204 responses, representative capability methods, and public facade compatibility

**Interfaces:**
- Consumes: current `organizationApi` methods and backend OpenAPI export.
- Produces: explicit capability modules plus a compatibility `organizationApi` facade; centralized `ApiError`/transport behavior and shared exported types.

- [ ] Write failing tests for module exports, preserved `organizationApi` method behavior, backend error detail propagation, 204 handling, and representative paths/types.
- [ ] Run focused API-client tests and confirm they fail against the monolithic-only structure.
- [ ] Move transport/error/types/capability methods without changing endpoint paths, payloads, or response shapes.
- [ ] Validate the generated/exported contract using the existing OpenAPI check; run frontend typecheck and focused tests.
- [ ] Commit `refactor: modularize api client capabilities`.

### Task 4: Component Host, architecture checks, parity records, and final verification

**Files:**
- Modify: `apps/web/src/app/component-gallery/ComponentGallery.tsx` and styles
- Modify: architecture scripts/checks, `docs/design/component-parity.md`, `docs/evidence/m1/verification.md`, and relevant package README/spec records
- Test: Component Host and architecture tests; existing browser suites

**Interfaces:**
- Consumes: all Task 1 public exports and Task 2 adopted consumers.
- Produces: working `/__components` previews for every implemented shared component, documented variants/deviations, and automated package-boundary enforcement.

- [ ] Add failing host/catalog assertions for each newly promoted shared component, supported states, dark/light rendering, and unfinished-state labeling.
- [ ] Run focused host tests and confirm the new entries are absent.
- [ ] Add actual public-export previews, metadata, and architecture rules; do not mark visual parity certified.
- [ ] Run architecture checks, full Vitest, API/OpenAPI checks, production build with route exclusion, and isolated Chromium journeys.
- [ ] Record automated adoption separately from human Figma review and commit `docs: record shared package verification`.

### Task 5: Whole-branch review and delivery evidence

- [ ] Run `git diff --check`, inspect the complete diff, and verify unrelated user changes remain untouched.
- [ ] Review package boundaries, consumer adoption, public exports, and parity records against this plan.
- [ ] Run the final verification command set and record exact counts/results.
- [ ] Report `PACKAGES_READY_FOR_REVIEW` or `PACKAGES_BLOCKED` with remaining genuine Figma differences and any deferred gaps.
