# Reconstruction verification

This record covers the reconstructed ORG-001 through ORG-009 slices. It does
not certify Figma visual parity, desktop packaging, or unimplemented legacy
capabilities.

Implementation commits: `6eca0da` (ORG-001) and `443cb0d` (ORG-002).

## Automated verification

- Frontend `npm test`: architecture boundaries, token check, typecheck,
  architecture tests 5/5, and Vitest 9/9.
- API Ruff and strict mypy: passed.
- API pytest: 11/11 passed; one upstream Starlette/httpx deprecation warning.
- OpenAPI export check: passed.
- Production build: passed; `/__components` is absent from `apps/web/dist`.
- Isolated Chromium: 6/6 passed across desktop/mobile. Playwright starts its
  own Vite and API processes with `reuseExistingServer: false` and a unique
  temporary API database; occupied ports and stale local data cannot silently
  attach to or contaminate the run.

## Retained browser evidence

- Organization: [desktop](../m1/desktop-organization.png).
- Planning/readiness/repository navigation: [desktop planning](../m1/desktop-planning.png), [mobile readiness](../m1/mobile-readiness.png); the same isolated Chromium journey also opens the repository metadata-only surface.
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
ORG-002 has API coverage for epic/feature creation and updates, task creation,
updates and reordering, acceptance criteria, dependency creation and removal,
and manual overview grouping, plus frontend board navigation; it remains
`IMPLEMENTED_NOT_REVIEWED` until browser evidence is complete. ORG-003 has
API tests for revisioned decisions, invariant acknowledgements, deterministic
R01–R06 evaluation, and stale saved history; it also remains
`IMPLEMENTED_NOT_REVIEWED` pending browser evidence. ORG-004 has API tests for
allowlist rejection, canonical Git validation, metadata-only observations,
feature links, and deduplicated `forge-context-v1` packages; it remains
`IMPLEMENTED_NOT_REVIEWED` pending browser evidence. ORG-005 has API coverage
for manual run transitions, append-only events, draft validation, immutable
handoff revision and exact acknowledgement. ORG-006 has API coverage for
provenance-labelled evidence, invalidation, frozen candidates, and blocked gate
evaluations. ORG-005 and ORG-006 remain `IMPLEMENTED_NOT_REVIEWED` pending
browser evidence and fuller delivery rules. ORG-007 has API coverage for
preview fingerprints, planning-only import, export, and stale-fingerprint
rejection; it remains `IMPLEMENTED_NOT_REVIEWED` pending full schema-limit
validation and browser evidence. ORG-008 has only the Rust policy scaffold;
Cargo/Tauri and installed Windows smoke are not certified. ORG-009 has
feature-owned organization, planning, readiness, workbench, and delivery
surfaces with responsive browser evidence; it remains
`IMPLEMENTED_NOT_REVIEWED` pending human Figma review. No legacy code/assets, private
bundles, real data migration, or desktop packaging were introduced.
