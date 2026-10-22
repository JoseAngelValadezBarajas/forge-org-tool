# UX-01 verification record

## Result

**UX_01_BLOCKED** — the implemented corrections and local automated checks are
evidence-ready, but the full Component Host category-preview decomposition is
unfinished, Rust formatting/Clippy could not run because Cargo is unavailable
in this environment, and GitHub Quality CI was not triggered from this
unpublished local branch. No human Figma visual certification is claimed.

Code implementation commit: fcb7bbb2aacf3c62d4c6047d778679e733bf3568.
Earlier scoped Button/Card commits: bcb96a2 and 76b8d92.

## Completed corrections

- Shared Button states follow the inspected Light bindings; Dark primary
  pressed uses a white label and is browser-tested at 5.41:1. Disabled,
  loading and focus-visible behavior are covered.
- Card has neutral div default and typed semantic roots; Default/Elevated
  containers, radius and padding are covered.
- Component Host has typed inventory modules, a development-only lazy route,
  isolated theme shell, section navigation, catalog family metadata, synthetic
  domain fixtures, and owned Foundations/Icons previews. The broader action,
  form, navigation, data, overlay and feature preview rendering still resides
  in one central switch and must be split into those owned preview modules.
- Planning exposes all six supported workflow statuses and responsive columns.
- Repository screens show basenames rather than local absolute paths.
- Workspace and delivery metric layouts are more legible at narrow widths.
- Playwright uses strict isolated servers, disposable SQLite state and a
  synthetic repository fixture; teardown removes only the marked fixture.

## Executed verification

| Check | Result |
| --- | --- |
| npm test | PASS — architecture 25/25; web 45 files/105 tests; tokens 8/8; UI 40 files/70 tests plus package browser 28/28; icons 35 files/38 tests; API client contract 2/2; packed consumer 1/1. |
| npm run test:e2e --workspace=@forge-org/web | PASS — isolated Chromium desktop/mobile, 22/22. Host overflow is checked at 1440, 1280, 1024, 390 and 375 px in Dark and Light. |
| npm run build | PASS — workspace packages and production web build. check:production-host confirms the route, UI text and synthetic fixtures are absent from production assets. |
| npm run lint:frontend | PASS — zero warnings. |
| Ruff lint/format checks | PASS. |
| npm run format:check:web | PASS. |
| API type generation/contract | PASS; generated OpenAPI declarations unchanged. |
| npm run lint / npm run format:check Rust portions | NOT RUN — cargo is not installed in this environment. |
| GitHub Quality CI | NOT RUN — local implementation branch was not pushed; no remote state was changed. |

## Screenshot evidence

Playwright captures use deterministic synthetic content and record actual
loaded screens. The desktop project viewport is 1280×720; mobile is
390×844. Product journeys also set 375px where noted by their test. Host
responsive overflow assertions additionally cover 1440, 1024 and 375px.

- Component Host: [desktop Dark](desktop-component-host-dark.png),
  [desktop Light](desktop-component-host-light.png),
  [mobile Dark](mobile-component-host-dark.png),
  [mobile Light](mobile-component-host-light.png).
- Product screens: [Organization desktop](desktop-organization.png),
  [Planning desktop](desktop-planning.png),
  [Feature Detail desktop](desktop-feature-detail.png),
  [Readiness mobile](mobile-readiness.png),
  [Context desktop](desktop-context-package.png),
  [Workbench desktop](desktop-workbench.png),
  [Delivery desktop](desktop-delivery.png),
  [Transfer desktop](desktop-transfer.png).

These screenshots are automated browser evidence, not a side-by-side human
Figma review. Every registry visual status remains NOT_HUMAN_REVIEWED.

## Remaining design and implementation work

- Decompose the consolidated preview switch into the owned action, form,
  navigation, surface/data, feedback/overlay and product-pattern preview
  modules. Current files split the route, shell, inventory metadata, fixtures,
  Foundations and Icons, but not all category examples.
- Obtain Windows/Cargo and GitHub Quality CI evidence after authorized
  publication of this local branch.
- Human review should resolve Button 40px versus Figma 36/38px sizing, the
  Dark Primary Pressed foreground conflict, Danger Pressed node/binding
  discrepancy, and any remaining screen-level visual differences.
- Workspace Home Figma 4:32 contains dashboard/attention information not
  supplied by current API records; do not fabricate those data flows.
- Feature Detail and Workbench page composition differences remain documented
  for human visual review; no unsupported domain states were invented.

No Figma values, PR state, original Forge archive, or real user data were
changed.
