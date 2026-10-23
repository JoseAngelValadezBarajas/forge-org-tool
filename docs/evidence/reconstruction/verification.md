# Reconstruction verification

This record covers the reconstructed ORG-001 through ORG-009 slices. It does
not certify Figma visual parity, human-installed Windows sign-off, or
unimplemented legacy capabilities.

## Project Overview and Epic Detail parity follow-up

Legacy comparison is pinned to `cadc4223d3c08c793b4f39152108997b697a7a75`;
target implementation is commit `d602bdd31d97ecbb05b4eb8e102d7f4dcb480103`.
The Project Overview API/client operations and Organization route are in the
preceding target commits recorded in branch history. Epic PATCH accepts the
source values `planning | archived` plus the already-public target values
`planned | in_progress | done`; OpenAPI and generated TypeScript types expose
that union. API characterization first failed with HTTP 422 for persisted
`planning`, then passed for all five states and rejected `paused` with 422.

- `PA-ORG-002`: project metadata edit and archive persisted through reload;
  Planning and Transfer links opened from the Overview. Chromium desktop and
  390px mobile passed (2/2 focused cases).
- `PA-PLAN-003`: Epic title/status persisted through reload and its Feature
  link opened Feature detail. Chromium desktop and 390px mobile passed (2/2).
- Screenshots are retained under the isolated Playwright output in
  `test-results/product-acceptance/forge-product-acceptance-34164576-73aa-4089-9fcf-13204a2dc1a9/playwright/`:
  `organization-organization--a6c04-ing-and-Transfer-navigation-chromium-desktop/project-overview.png`,
  corresponding `chromium-mobile/project-overview.png`, and
  `planning-planning-workflow-24e6a--Feature-navigation-persist-chromium-desktop/epic-detail.png`,
  corresponding `chromium-mobile/epic-detail.png`. These are local ignored
  test artifacts, not committed screenshots or human visual certification.
- Focused API tests: 4/4; focused web tests: 35/35; web typecheck, Ruff,
  mypy, architecture, and OpenAPI export check passed. Full Vitest: 183/183.
- Full isolated Playwright rerun passed 50/50 across Chromium desktop and
  mobile, including the unchanged existing Handoff journeys. The preceding
  attempt had a transient Handoff-mobile timeout (49/50); that test passed
  alone and then in the complete rerun. No test or assertion was weakened.
- `npm test` passed architecture/tooling, API-type drift, typecheck, all
  frontend tests (183/183), UI/tokens/icons/API-client package tests, and
  packed external-consumer verification. Full API pytest passed (33 tests plus
  one subtest); OpenAPI export check, Ruff, strict mypy, frontend lint, and
  production build including Component Host exclusion passed.
- Full local Playwright acceptance passed 50/50. After the final effect/lint
  adjustment, the two new browser journeys were rerun and passed 4/4 desktop
  and mobile. Prettier and Ruff formatting checks passed. Rustfmt/Clippy and
  GitHub Quality for the new commit were not run: Cargo is not installed in
  this Windows environment, and the branch was not pushed (PR remains open).

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
downloads. `f83e1a9` completes the ORG-006 delivery truth vertical slice with
evidence filtering/invalidation, draft candidate revision and freeze controls,
candidate and gate history, deterministic verification controls, blocked gate
evaluation, and retained non-published manifest behavior.
`dcda574` completes ORG-007 transfer verification with reviewed import commit
coverage, controlled duplicate-name rejection, focused UI tests, and retained
desktop/mobile import evidence.
`3221de0` adds versioned SQLAlchemy-backed SQLite migrations and synthetic
fresh/upgrade/future-version safety tests. `159a930` adds the packaged desktop
sidecar lifecycle and aligns the product hierarchy; `f6bfdce` disambiguates the
delivery browser assertion; `8031914` orders sidecar packaging before Tauri
compilation in CI. Final retained browser captures are in evidence commit
`734c25a`.

## Automated verification

- Frontend `npm test`: architecture boundaries, token check, typecheck,
  architecture tests 5/5, and Vitest 20/20 across 11 files.
- API Ruff and strict mypy: passed.
- API pytest: 16/16 passed; one upstream Starlette/httpx deprecation warning.
- Desktop Python suite: 9/9 passed, including sidecar command/readiness,
  fresh/restart persistence, backup creation, and synthetic v1 upgrade smoke.
  The PyInstaller sidecar package completed locally; Rust/Tauri compilation is
  gated by the current GitHub Quality run.
- OpenAPI export check: passed.
- Production build: passed; `/__components` is absent from `apps/web/dist`.
- GitHub Quality run [39388716075](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39388716075) passed for implementation commit `f83e1a9`; web, API, and Windows desktop jobs completed successfully.
- GitHub Quality run [39390208428](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39390208428) passed for ORG-007 commit `cdc8114`; web, API, and Windows desktop jobs completed successfully.
- GitHub Quality run [39390708097](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39390708097) passed for final documentation commit `39b0421`; web, API, and Windows desktop jobs completed successfully.
- GitHub Quality run [39391658113](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39391658113) passed for ORG-009 behavior-status commit `c112f2b`; web, API, and Windows desktop jobs completed successfully.
- GitHub Quality run [39392594672](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39392594672) passed for ORG-008 sidecar lifecycle commit `8ed6b3c`; web, API, and Windows desktop jobs completed successfully.
- GitHub Quality run [39422706855](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39422706855) passed API, web, isolated Chromium, sidecar packaging, desktop smoke, Tauri tests, and Windows release build for commit `b71c63e`.
- Isolated Chromium: 18/18 passed across desktop/mobile. The delivery journey
  records and filters reported evidence, invalidates it without erasure, edits
  and freezes a candidate, evaluates a blocked gate, and retains gate history.
  Playwright starts its
  own Vite and API processes with `reuseExistingServer: false`, one serialized
  worker, and a unique temporary API database; occupied ports and stale local
  data cannot silently attach to or contaminate the run.

## Retained browser evidence

- Organization: [desktop](../m1/desktop-organization.png), [mobile](../m1/mobile-organization.png).
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
ORG-006 has API coverage for provenance-labelled evidence, invalidation,
revisioned candidates, deterministic verification, frozen candidates, blocked
gate evaluations, and non-published manifests. Its focused UI test and
desktop/mobile browser journey cover evidence filtering/invalidation, draft
candidate editing/freezing, candidate/gate history, and the blocked gate
truth boundary. ORG-006 is `VERIFIED` for automated behavior; this does not
certify Figma visual parity. ORG-007 has API
coverage for preview fingerprints, planning-only import, export,
stale-fingerprint rejection, controlled duplicate-name rejection, collection
limits, cycle rejection, and new-ID creation. Its focused UI test and
desktop/mobile browser journey cover export, edited-document preview, reviewed
fingerprint commit, validation errors, and the `IMPORTED_PLANNING_ONLY` truth
state. ORG-007 is `VERIFIED` for automated behavior; this does not certify
Figma visual parity. ORG-008 has an authenticated sidecar boundary, desktop
launch/path policy, restricted Tauri host skeleton, versioned migration safety,
packaged sidecar, and synthetic isolated restart/backup smoke. Its installed
Windows product smoke and human migration sign-off remain open. ORG-009 has
feature-owned organization, planning, readiness, workbench, and delivery
surfaces with responsive browser evidence and explicit manual/reported/blocked
truth states. ORG-009 is `VERIFIED` for automated behavior; human Figma review
and visual certification remain separate. No legacy code/assets, private
bundles, or real data migration were introduced.
