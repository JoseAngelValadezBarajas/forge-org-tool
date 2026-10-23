# Project Overview Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original Project Overview user workflow in FORGE Org Tool while retaining its workspace-scoped API, feature boundaries, and shared-package architecture.

**Architecture:** Add only the missing generated-contract API-client operations for reading/updating a Project, then compose a feature-owned Organization overview route from existing shared UI and the already-supported planning and transfer workflows. Keep the planning board URL intact and expose an independent Epic detail workflow in Planning as a second vertical slice, with full browser coverage added after both pages are available.

**Tech Stack:** React 19, React Router, `@forge-org/ui`, `@forge-org/api-client`, FastAPI/OpenAPI, Vitest, Playwright, disposable SQLite.

**Spec:** `docs/specs/ORG-001-organization/spec.md` (`REQ-ORG-001-PROJECT-OVERVIEW`); Epic detail behavior is grounded in the canonical original source `cadc4223d3c08c793b4f39152108997b697a7a75`, `frontend/src/app/router.tsx`, `frontend/src/features/planning/pages/EpicDetailPage.tsx`, and `frontend/e2e/ux01a-navigation.spec.ts`.

## Global Constraints

- `packages/ui` must not import API, app, features, or backend.
- Feature-to-feature imports require a documented `index.ts` public API; avoid deep imports across features.
- Durable product state belongs to the backend.
- Client and server contracts must not drift.
- Reusable package changes must pass their independent build and packed external-consumer test; consumers must not import package source paths.
- Existing planning route `/planning/:workspaceId/:projectId` must remain available and preserve its current board behavior.
- The API-client response/request types must alias the generated OpenAPI contract; do not duplicate DTOs.
- Never claim human Figma visual certification from automated browser evidence.

## Review Focus

- A Project ID belonging to another workspace or not found must show an error/retry state, not a blank successful overview.
- Updating project fields must retain server validation and the active/archived status; failed updates must not show a success state.
- Archiving and restoring must persist and the same Project must remain navigable; archived planning stays read-only according to existing behavior.
- An Epic without Features must still have a reachable detail page; an Epic in another Project must not appear as the selected Epic.
- Page navigation and breadcrumbs must preserve workspace/project context for deep links and browser reload.

---

### Task 1: Add generated-contract Project API operations

**Files:**
- Modify: `packages/api-client/src/organization.ts`, `packages/api-client/src/types.ts`
- Test: `apps/web/src/api-client-contract.test.ts`

**Interfaces:**
- Produce `organizationCapability.getProject(workspaceId: string, projectId: string): Promise<Project>` using `GET /api/v1/workspaces/{workspaceId}/projects/{projectId}`.
- Produce `organizationCapability.updateProject(workspaceId: string, projectId: string, values: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project>` using `PATCH` on the same path.
- Keep both methods available through `organizationApi`; use the generated `ProjectUpdate` schema alias for request typing.

- [ ] Add contract assertions for GET path, PATCH method/body, and same-origin credentials through `organizationApi`.
- [ ] Run the focused contract test and confirm the missing operations cause the expected RED failure.
- [ ] Add `ProjectUpdate` as an OpenAPI-derived type and implement both methods in `organizationCapability`.
- [ ] Run focused contract test, API-client build, and existing API-client package contract.

### Task 2: Implement the Project Overview route and interactions

**Files:**
- Create: `apps/web/src/features/organization/ProjectOverviewPage.tsx`, colocated CSS module and unit test.
- Modify: `apps/web/src/features/organization/index.ts`, `apps/web/src/features/organization/OrganizationPage.tsx`, `apps/web/src/features/planning/components/ProjectCard/ProjectCard.tsx` and test, `apps/web/src/app/App.tsx`.

**Interfaces:**
- Route: `/projects/:workspaceId/:projectId`.
- Consume only `organizationApi`, the public `@forge-org/ui` exports, and workspace-scoped route parameters.
- Provide owning Workspace and Project metadata/timestamps; real counts for Features, Tasks, Epics, satisfied/total declared criteria and Dependencies; total Decision and active Invariant counts; and up to four pending Features ordered by priority then update time. Provide edit/save, archive after explicit confirmation, restore, retryable loading/error states, Planning navigation, and a link to existing Transfer export. Reuse API-client capability operations; make no delivery/evidence claims from planning state.
- Retain an explicit direct board link from the Organization project card.

- [ ] Add focused feature and route tests for persisted project data, edit, archive/restore, retry/error, and navigation before production implementation.
- [ ] Run those tests to confirm they fail because the route/page and API contract are missing.
- [ ] Implement the page using shared UI primitives and CSS Modules; do not add a duplicate generic control or new endpoint.
- [ ] Route project cards to Overview while retaining an explicit “Open planning board” link.
- [ ] Run focused unit tests, typecheck, and frontend regression tests.

### Task 3: Restore the independent Epic detail workflow

**Files:**
- Create: `apps/web/src/features/planning/EpicDetailPage.tsx` and colocated CSS module/test.
- Modify: `apps/api/src/forge_org/api/schemas.py`, `apps/api/tests/test_planning.py`, generated `contracts/openapi/forge-org-v1.json` and `packages/api-client/src/generated/openapi.d.ts`, `apps/web/src/features/planning/index.ts`, `apps/web/src/features/planning/components/EpicCard/EpicCard.tsx` and test, `apps/web/src/app/App.tsx`.

**Interfaces:**
- Route: `/planning/:workspaceId/:projectId/epics/:epicId`.
- Load the Project and Planning overview through the public API-client facade; select only the Epic matching both route Project and Epic IDs.
- Support feature links and the original Epic edit/status workflow, guarded by the current Project's active status; preserve existing Epic summary behavior.
- Epic status supports `planning | archived` from original persisted behavior and `planned | in_progress | done` already accepted by the target API. First characterize the contradictory PATCH schema with a failing integration test; then correct the Pydantic/OpenAPI contract to a backward-compatible generated `Literal` enum, regenerate checked OpenAPI and TypeScript declarations, and retain GET/create behavior and all previously accepted PATCH values.

- [ ] Add a failing API integration test proving newly created `planning` Epics can be updated and status can transition to `archived`, while previously accepted `planned`, `in_progress` and `done` values remain accepted; current schema should return 422 for the original valid state.
- [ ] Run the focused API test and confirm the RED is the incorrect Epic status contract, not environment/setup.
- [ ] Correct the `EpicUpdate` and `EpicResponse` schema using a backward-compatible typed Literal; regenerate `contracts/openapi/forge-org-v1.json` and `packages/api-client/src/generated/openapi.d.ts`.
- [ ] Run the API test and OpenAPI/type-generation drift checks to verify all five supported statuses and the typed enum.
- [ ] Add focused route/page tests for selected Epic metadata, its Feature links, edit/save, archived-Project read-only behavior, unavailable Epic, and retry before web implementation.
- [ ] Verify RED is caused by the absent detail route and behavior.
- [ ] Implement the feature-owned Epic page and a semantic detail link from each EpicCard.
- [ ] Run focused API/UI tests, typecheck, lint/architecture checks, and existing planning component/page tests.

### Task 4: Certify the real-user journeys and update traceability

**Files:**
- Modify: `apps/web/e2e/organization/organization-workflows.spec.ts`, `apps/web/e2e/planning/planning-workflows.spec.ts`, `docs/specs/ORG-001-organization/acceptance.md`, `docs/reconstruction/functional-parity.md`, `docs/evidence/` and applicable product-acceptance records.

**Interfaces:**
- Add `PA-ORG-002` for Organization → Project Overview → edit/status persistence → Planning board and Transfer export navigation.
- Extend `PA-PLAN-001` or add a focused planning acceptance ID for Epic detail/edit/Feature navigation.
- Use isolated API + disposable SQLite; API may prepare only prerequisites, while Project/Epic navigation and edits are actual UI actions.

- [ ] Add browser tests and verify each fails for the intended missing route/action before implementation is accepted.
- [ ] Run the focused journeys in isolated Chromium desktop and 390px responsive viewport; assert persisted API state and reload behavior.
- [ ] Update the parity row only after passing user-facing evidence, keep automated behavior separate from visual review, and record exact source/target SHAs.
- [ ] Run architecture checks, focused UI/API client tests, frontend suite, package consumer, production build, and relevant Playwright acceptance.
- [ ] Record the implementation commit and results; do not merge PR #2 or push without separate authorization.
