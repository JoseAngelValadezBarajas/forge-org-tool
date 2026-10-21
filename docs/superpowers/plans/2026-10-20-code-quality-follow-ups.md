# Code Quality Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the verified maintainability findings after `d520e79` while preserving the frontend, API, persistence, OpenAPI, and desktop contracts.

**Architecture:** Keep the public `organizationApi` facade and the existing FastAPI application entrypoint. Split client operations and backend routes/persistence by capability using thin composition modules and shared types/connection primitives; do not change endpoint paths, payloads, migration versions, or transaction semantics.

**Tech Stack:** TypeScript, React 19, ESLint 9 with `eslint-plugin-react-hooks`, Vitest/Testing Library, FastAPI, Python 3.12, SQLite/SQLAlchemy connection lifecycle, Rust/Tauri, npm/uv/Cargo.

**Spec:** User request: “FORGE Org Tool · Complete Code Quality Follow-ups”.

## Global Constraints

- Preserve the resolved dependency versions unless a change is justified.
- Preserve `organizationApi` and exact HTTP contracts.
- Preserve transaction boundaries, schema migration compatibility, fingerprints, and public OpenAPI behavior.
- Do not silence React Hook warnings through blanket configuration changes.
- Do not merge PR #1, archive original FORGE, or change real user data.
- Verify clean-checkout commands and GitHub Quality CI before certification.

## Review Focus

- Rapid route changes must not commit stale API responses: add a regression test for last-request-wins behavior.
- Component unmount during an in-flight request must not update state: add an abort/unmount regression test.
- Organization workspace changes must not leave projects from the prior workspace visible: test the workspace transition.
- Client facade exports must remain source-compatible after module extraction: test representative capability exports and HTTP requests.
- Backend route registration must preserve the OpenAPI path/method surface: compare the generated contract after extraction.

### Task 1: Repository tooling contract

**Files:**
- Modify: `package.json`
- Test: `tooling/scripts/package-contract.test.mjs`

- [ ] Write a test that parses root `package.json`, asserts one `devDependencies` object, asserts `lint:fix` names both concrete Desktop manifests, and checks the declared command strings.
- [ ] Run `node --test tooling/scripts/package-contract.test.mjs` and observe the duplicate-key/tooling assertion fail.
- [ ] Consolidate dependencies without changing resolved versions and correct `lint:fix` to target `apps/desktop/Cargo.toml` and `apps/desktop/src-tauri/Cargo.toml`.
- [ ] Run the focused test and `npm install --package-lock-only --ignore-scripts`; expect both to pass without unrelated dependency resolution changes.
- [ ] Commit `build: repair root tooling contract`.

### Task 2: React request lifecycle and zero-warning lint

**Files:**
- Modify: `eslint.config.js`
- Modify: `apps/web/src/features/{context,delivery,organization,planning,readiness,repositories,workbench}/*.tsx`
- Test: the affected page tests, with request-race coverage in `PlanningPage.test.tsx` and workspace transition coverage in `OrganizationPage.test.tsx`.

- [ ] Add failing tests for stale planning responses and Organization workspace transitions.
- [ ] Run the focused tests and observe the failures against the current uncancelled loaders.
- [ ] Implement stable callbacks, `AbortController` cancellation, request identity/active guards, and effect dependencies without changing visible successful/error states.
- [ ] Remove the temporary `set-state-in-effect` warning override and set frontend lint to error on both hook rules.
- [ ] Run affected Vitest tests, then `npx eslint apps/web/src`; expect zero warnings and zero errors.
- [ ] Commit `fix: make frontend loading effects race-safe`.

### Task 3: Capability-specific API client modules

**Files:**
- Modify: `packages/api-client/src/types.ts`
- Create: `packages/api-client/src/{planning,readiness,repositories,context,transfer,workbench,delivery}.ts`
- Modify: `packages/api-client/src/capabilities.ts`
- Modify: `packages/api-client/src/index.ts`
- Test: `packages/api-client/src/capabilities.test.ts` or the existing client contract test location.

- [ ] Add a failing export/HTTP contract test covering planning, repository, transfer, and delivery operations through `organizationApi`.
- [ ] Run it and confirm the current monolithic facade is the baseline being pinned.
- [ ] Move shared response types to `types.ts`, move operation groups into cohesive modules, compose them in `capabilities.ts`, and keep `organizationApi` unchanged.
- [ ] Run typecheck and the focused client contract tests; compare representative request paths, methods, bodies, and response types.
- [ ] Commit `refactor: split api client capabilities`.

### Task 4: Bounded backend route composition

**Files:**
- Create: `apps/api/src/forge_org/api/routes/{organization,planning,readiness,repositories,context,workbench,delivery,transfer}.py`
- Modify: `apps/api/src/forge_org/api/routes.py`
- Modify: `apps/api/src/forge_org/main.py` only if router composition requires it.
- Test: `apps/api/tests/test_route_contract.py`.

- [ ] Add a characterization test comparing route method/path/name coverage and generated OpenAPI output before extraction.
- [ ] Run it and record the current route surface.
- [ ] Move handlers by bounded capability into router modules using the existing schemas, dependencies, error mapping, and service calls; make `routes.py` a composition module.
- [ ] Run the characterization test, API suite, and OpenAPI check; require identical route coverage and contract output.
- [ ] Commit `refactor: compose api routes by capability`.

### Task 5: Cohesive SQLite persistence modules

**Files:**
- Create/modify: `apps/api/src/forge_org/infrastructure/persistence/{base,organization,planning,repositories,context,workbench,delivery}.py`
- Modify: `apps/api/src/forge_org/infrastructure/sqlite.py`
- Test: `apps/api/tests/test_persistence_contract.py` and existing migration/application tests.

- [ ] Add characterization tests for migration version, fingerprint-producing records, transaction rollback, and representative repository methods.
- [ ] Run them against the current store and record the passing baseline.
- [ ] Extract cohesive repository mixins/modules while retaining one transactional `OrganizationRepository` composition and the existing `sqlite` import compatibility where used.
- [ ] Run migration, application, persistence, and OpenAPI tests; require unchanged schema version and fingerprints.
- [ ] Commit `refactor: split sqlite persistence by capability`.

### Task 6: Full verification and evidence

**Files:**
- Modify: `docs/evidence/quality/verification.md`
- Modify: `CONTRIBUTING.md` only if clean-checkout command instructions need correction.

- [ ] Run Prettier, zero-warning ESLint, Ruff, mypy, rustfmt, Clippy, architecture checks, frontend/backend tests, OpenAPI checks, isolated Playwright, desktop tests/build, and the documented clean-checkout command set.
- [ ] Run GitHub Quality CI on the final commit and inspect all jobs.
- [ ] Update verification evidence with exact commit, CI run, counts, and residual findings.
- [ ] Commit `docs: certify code quality follow-ups` if evidence changed.
