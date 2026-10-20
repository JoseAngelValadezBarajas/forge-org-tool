# Reconstruction verification

This record covers the reconstructed ORG-001 through ORG-009 slices. It does
not certify Figma visual parity, desktop packaging, or unimplemented legacy
capabilities.

Implementation commits include `6eca0da` (ORG-001), `e909ce9` (planning
mutations), `38826b2` (knowledge revisions), `5499101` (context retrieval),
`3a39790` (evidence filtering), `01c6e42` (run retrieval), `fec502d`
(transfer limits), `6c7e309` (repository web surface), and `96ed4b9`
(latest retained browser evidence). Subsequent delivery/workbench commits are
`4a1c5c9` (handoff revisions), `aecf36b` (release-candidate history),
`753b4be` (workbench/transfer surfaces), `9d2b518` (context verification),
  `ec7a943` (planning detail), `5576ccb` (shell command palette), `522840a`
(handoff lifecycle), `5674f35` (refreshed evidence), `40dedfb` (Windows
resource icon), `13f7fc5` (isolated desktop CI frontend build), and `c519526`
(ORG-002/003 vertical-slice verification, feature-scoped invariant listing,
focused tests, and retained browser evidence). `548e21a` completes the
ORG-004 repository/context vertical slice with feature links, context package
preview/save/download, responsive browser evidence, and focused UI tests.
`5f7ec95` completes the ORG-005 reported handoff lifecycle with focused UI
tests, immutable revision history, acknowledgement state, and JSON/Markdown
downloads.

## Automated verification

- Frontend `npm test`: architecture boundaries, token check, typecheck,
  architecture tests 5/5, and Vitest 16/16 across 9 files.
- API Ruff and strict mypy: passed.
- API pytest: 13/13 passed; one upstream Starlette/httpx deprecation warning.
- Desktop launch policy: 3 Python unit tests passed; the authenticated sidecar
  tests passed as part of the API suite. Native Rust/Tauri compilation and
  desktop launcher tests passed in [GitHub Quality run 39387177955](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39387177955).
- OpenAPI export check: passed.
- Production build: passed; `/__components` is absent from `apps/web/dist`.
- Isolated Chromium: 18/18 passed across desktop/mobile. Playwright starts its
  own Vite and API processes with `reuseExistingServer: false`, one serialized
  worker, and a unique temporary API database; occupied ports and stale local
  data cannot silently attach to or contaminate the run.

## Retained browser evidence

- Organization: [desktop](../m1/desktop-organization.png).
- Planning/readiness/repository navigation: [desktop planning](../m1/desktop-planning.png), [mobile readiness](../m1/mobile-readiness.png); the same isolated Chromium journey also opens the repository metadata-only surface.
- Delivery verification: [desktop](../m1/desktop-delivery.png), [mobile](../m1/mobile-delivery.png); both show the explicit `NOT_PUBLISHED` boundary.
- Workbench/handoff: [desktop](../m1/desktop-workbench.png), [mobile](../m1/mobile-workbench.png); reported run creation, draft editing, ready transition, immutable revision, acknowledgement, and JSON/Markdown downloads were exercised.
- Project transfer: [desktop](../m1/desktop-transfer.png), [mobile](../m1/mobile-transfer.png); export and reviewed fingerprint remain planning-only.
- Readiness/repository context: [desktop](../m1/desktop-context.png), [mobile](../m1/mobile-context.png); decisions, invariants, criteria, and metadata-only observation were exercised without source-content reads.
- Feature context packages: [desktop](../m1/desktop-context-package.png), [mobile](../m1/mobile-context-package.png); feature repository linking, `forge-context-v1` preview/save, and JSON/Markdown download links were exercised. The mobile save action was keyboard-activated after Playwright pointer hit-testing encountered an ancestor overlap on the long responsive page.
- Planning feature detail: [desktop](../m1/desktop-feature-detail.png), [mobile](../m1/mobile-feature-detail.png); task creation, acceptance criteria, and a manual task transition were exercised.
- Application shell: command palette keyboard invocation, escape dismissal, and light-theme control were exercised in both viewport projects.
- Component Host dark/light: [desktop dark](../m1/desktop-component-host-dark.png),
  [desktop light](../m1/desktop-component-host.png), [mobile dark](../m1/mobile-component-host-dark.png),
  and [mobile light](../m1/mobile-gallery-light.png).

## Human review boundary

Screenshots demonstrate runtime behavior and responsive coverage. They do not
mark components as visually certified. The parity register remains
`IMPLEMENTED_NOT_REVIEWED`; Button's 40px implementation height versus the
36/38px Figma reference, StatusChip Info/Reported naming, Card Elevated,
SectionHeader counter composition, and the OrganizationEmptyState product
reference remain explicit review items.

## Scope truth

ORG-001 is verified for workspace/project persistence, selection, search,
create, archive, restore, duplicate protection, and cross-workspace isolation.
ORG-002 has API and browser coverage for epic/feature creation and updates, task creation,
updates and reordering, acceptance criteria, dependency creation and removal,
and manual overview grouping, plus board and feature-detail browser navigation;
it is `VERIFIED` for automated behavior. ORG-003 has
API tests for revisioned decisions, invariant acknowledgements, deterministic
R01–R06 evaluation, and stale saved history; it also remains
`VERIFIED` for automated behavior. ORG-004 has API tests for
allowlist rejection, canonical Git validation, metadata-only observations,
feature links, and deduplicated `forge-context-v1` packages, plus browser
coverage for metadata-only repository observation; it remains
`VERIFIED` for automated behavior. ORG-005 has API coverage
for manual run transitions, append-only events, draft validation, immutable
handoff revision and exact acknowledgement; browser coverage now includes
reported runs, draft editing, ready/acknowledged handoffs, immutable revision
history, and JSON/Markdown downloads; it is `VERIFIED` for automated behavior.
ORG-006 has API coverage for
provenance-labelled evidence, invalidation, frozen candidates, and blocked gate
evaluations. ORG-006 now has browser coverage for deterministic verification,
blocked/pass gates, and non-published manifests; it remains
`IMPLEMENTED_NOT_REVIEWED` pending human Figma review. ORG-007 has API
coverage for
preview fingerprints, planning-only import, export, stale-fingerprint
rejection, collection limits, cycle rejection, and the browser transfer flow;
it remains `IMPLEMENTED_NOT_REVIEWED` pending human Figma review. ORG-008 has
an
  authenticated sidecar boundary, desktop launch/path policy, and restricted
  Tauri host skeleton; automated Cargo/Tauri compilation is verified in CI, but
  packaging and installed Windows smoke are not certified. ORG-009 has
feature-owned organization, planning, readiness, workbench, and delivery
surfaces with responsive browser evidence; it remains
`IMPLEMENTED_NOT_REVIEWED` pending human Figma review. No legacy code/assets, private
bundles, real data migration, or desktop packaging were introduced.
