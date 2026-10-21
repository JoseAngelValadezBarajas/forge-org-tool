# Architecture External Review Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the verified P0/P1 integration gaps identified against commit `0170e8f` without reopening the completed reconstruction.

**Architecture:** Keep the browser API transport unchanged and add a narrowly scoped Tauri command bridge whose Rust side owns sidecar credentials, port, lifecycle, and request validation. Keep `organizationApi` and the legacy backend router import compatible while extracting only the necessary composition boundaries. Package UI CSS as scoped consumer-safe assets and retain visual evidence only when real content and review provenance are present.

**Tech Stack:** React/TypeScript, Vite, Tauri 2/Rust, FastAPI/Pydantic, pytest, Vitest, Playwright, npm workspaces, Windows NSIS.

**Spec:** `docs/specs/ORG-008-desktop/spec.md`, `docs/specs/ORG-009-web-surfaces/spec.md`, `docs/architecture/RFC-001.md`, and this external-review objective.

## Global Constraints

- Rust owns sidecar token, port, lifecycle, and authenticated requests; React receives only permitted operation results.
- Browser same-origin behavior remains unchanged.
- Preserve exact backend paths, methods, request bodies, response models, route ordering, status codes, migrations, and transaction boundaries.
- Do not expose arbitrary URLs, shell/process capabilities, filesystem access, sidecar ports, or bearer tokens to React.
- Do not use mock/Figma data in product screens or claim human visual certification without external review.
- Do not change real user data, merge PR #1, publish packages, or archive original FORGE.

## Review Focus

- Desktop sidecar readiness failure, restart, shutdown, and authenticated request rejection must fail closed and be recoverable.
- The legacy router export must contain the same non-empty route surface and cannot be accepted by a vacuous zero-route test.
- A consumer class named `.button`, `.card`, `.control`, or similar must not be changed by the packed UI stylesheet.
- Visual screenshots must show loaded content and identify automated evidence separately from human Figma review.
- The installed NSIS product must exercise UI → IPC → sidecar → SQLite, then restart and observe persisted state.

### Task 1: Desktop transport bridge

**Files:** `apps/desktop/src-tauri/src/**`, `apps/web/src/**` transport/client boundary, desktop tests and ORG-008 docs only.

- [x] Write focused Rust/TypeScript tests for allowed operation dispatch, token non-disclosure, readiness failure, restart, and shutdown.
- [x] Implement a typed IPC boundary for the supported API capabilities; keep browser fetch as the web transport.
- [x] Connect existing Rust method/path/body validation to real commands and sidecar lifecycle ownership.
- [x] Build the packaged PyInstaller sidecar and run the synthetic persistence smoke; real NSIS/installed UI verification remains runner-blocked.
- [x] Run focused TypeScript, sidecar, and Python smoke checks; commit the P0 change.

### Task 2: Backend router compatibility

**Files:** `apps/api/src/forge_org/api/routes.py`, bounded route modules, backend characterization/OpenAPI tests.

- [x] Add a failing characterization test asserting the legacy import exposes the complete non-empty route surface and exact OpenAPI contract.
- [x] Extract or compose bounded routers while preserving dependencies, ordering, response models, and status codes.
- [x] Make the boundary test fail when a legacy router has zero routes, then pass against the composed implementation.
- [x] Run backend and OpenAPI suites; commit the compatibility correction. The legacy facade now exposes 91 API operations; `/api/v1/health` remains composed by the application root.

### Task 3: UI package CSS distribution

**Files:** `packages/ui/**`, package build/consumer fixtures and tests, package documentation.

- [x] Add a failing packed-consumer test proving generic consumer selectors remain unchanged while UI tokens and component styles work in light/dark themes.
- [x] Replace raw CSS Module concatenation with a documented scoped delivery strategy compatible with the advertised ESM environment; do not add speculative runtime wrappers.
- [x] Build, pack, and test an external consumer; document the bundler requirement for SSR.
- [x] Commit the package correction.

### Task 4: Truthful visual evidence

**Files:** `docs/evidence/**`, review docs, and only the minimal web layout files if a concrete structural deviation is verified.

- [x] Capture Organization and Delivery after synthetic real data loads at representative desktop and mobile sizes.
- [x] Compare against Figma `4:32` and `76:3`, record concrete deviations and source node evidence, and distinguish automated screenshot checks from human review.
- [x] Run isolated Playwright with no unrelated-server reuse; retain truthful screenshots and metadata.
- [x] Commit evidence/documentation separately from runtime changes.

### Task 5: Integrated certification

- [x] Run package builds/external consumer tests, TypeScript, frontend/backend tests, OpenAPI checks, isolated Playwright, and Python installed-smoke coverage. Rust checks and installed NSIS UI smoke remain unavailable without Cargo/runner execution.
- [ ] Run GitHub Quality CI and record exact commit/run identifiers, screenshot paths, installer evidence, and unresolved issues.
- [ ] Mark the goal complete only if P0 and every P1 have direct passing evidence; otherwise report the exact remaining blockers.

## Self-Review

The plan covers all four review findings and the requested certification gates. Write ownership is disjoint between the delegated desktop/backend/CSS/evidence work; integration and final verification remain on the main branch. No step changes product data or introduces an unadvertised package/runtime capability.
