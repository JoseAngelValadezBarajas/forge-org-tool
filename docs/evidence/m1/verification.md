# M1 verification evidence

Focused audit implementation commit: `bbf5fa2` (`feat: expose delivery verification truth states`). The shared package initiative adds `a8ea80d` (committed implementation plan), `5f3377e` (shared UI contracts), `3fca7bf` (feature consumer adoption), and the current API/Component Host documentation commit recorded below.
Shared package implementation commit: `7ed33e1`; isolated browser evidence refresh: `58661ea`.

Final verification commit: `734c25a`; the browser evidence refresh follows the green GitHub Quality run `39422706855` for the same implementation state. Documentation commit `ae598c4` was verified by Quality run `39423678963`.

The subsequent ORG-001 reconstruction evidence is recorded in
`docs/evidence/reconstruction/verification.md`; this M1 record remains the
foundation audit record.

## Local evidence

- Node/npm: Node 24.13.0, npm 11.6.2.
- Python/uv: Python 3.12.10, uv 0.12.7.
- `npm run test`: architecture boundaries passed, token check passed, typecheck passed, architecture tests 5/5, Vitest 20/20 across 11 files.
- `npm run build`: Vite production build passed; the development-only `/__components` route was absent from `apps/web/dist`.
- `npm run test:e2e`: isolated Chromium desktop/mobile smoke passed 18/18, including shell command-palette/theme behavior, planning feature detail, readiness/repository context, delivery, workbench/handoff, transfer truth-state navigation, and the feature context package journey; Component Host dark/light and representative feature screenshots are retained beside this file: `desktop-component-host-dark.png`, `desktop-component-host.png`, `mobile-component-host-dark.png`, `mobile-gallery-light.png`, `desktop-planning.png`, `mobile-readiness.png`, `desktop-delivery.png`, `mobile-delivery.png`, `desktop-workbench.png`, `mobile-workbench.png`, `desktop-transfer.png`, `mobile-transfer.png`, `desktop-context.png`, `mobile-context.png`, `desktop-context-package.png`, `mobile-context-package.png`, `desktop-feature-detail.png`, and `mobile-feature-detail.png`.
- API: Ruff passed, strict mypy passed, pytest passed 16/16, OpenAPI check passed, including fresh/v1-upgrade/future-version migration safety.
- Live API: `/api/v1/health` returned HTTP 200 with `scope=bootstrap-only`; fabricated `/api/v1/workspaces` returned HTTP 404.
- Public-file audit: no credential patterns, machine-specific absolute paths, databases, keys, logs, backups, or attachments were staged.
- GitHub Quality: run [39388716075](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39388716075) passed for `f83e1a9`; web, API, and Windows desktop jobs completed successfully.
- GitHub Quality: run [39390208428](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39390208428) passed for `cdc8114`; web, API, and Windows desktop jobs completed successfully.
- GitHub Quality: run [39390708097](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39390708097) passed for final documentation commit `39b0421`; web, API, and Windows desktop jobs completed successfully.
- Component Host: `/__components` renders public `@forge-org/ui` exports and the existing organization feature with deterministic local fixtures; it makes no backend calls. The route remains development-only and is excluded from production output.
- Shared package adoption: Organization, Planning, Repositories, Workbench, Delivery and Transfer now consume the public `@forge-org/ui` controls where the contract applies; no `@forge-org/icons` or `@forge-org/testing` package was created because there is no licensed icon consumer or cross-package test utility need.
- API client: `transport.ts`, `errors.ts`, `types.ts`, and the `organization.ts` capability module now back the compatibility-preserving `organizationApi` facade. Remaining capability methods retain their public behavior while moving incrementally behind the same transport boundary.
- Component Host coverage: every implemented shared export has a deterministic preview under `/__components`; dark/light and representative desktop/mobile evidence are retained. This is automated behavior evidence only, not human Figma certification.
- Figma review: read-only node context and retained captures were reviewed for Button `173:27`, StatusChip `173:40`, Card `173:65`, SectionHeader `178:191`, and product reference screen `4:32`. These are human-review inputs, not visual certification.
- Playwright isolation: both servers use `reuseExistingServer: false`; the API also receives a unique temporary SQLite path per run, so occupied ports or stale local data cannot silently affect assertions. Port occupation fails the controlled server startup instead of attaching to an unknown process.
- Shared contracts: Card default `div` and typed semantic option passed; Button loading/disabled/pressed DOM contract passed. Button visual parity remains unreviewed, including the 40px implementation height versus the 36/38px Figma reference.

## Clean-clone evidence

The final public repository was cloned into an isolated temporary directory. `npm ci`, the full frontend test/build gate, `uv sync --locked`, Ruff, strict mypy, pytest 2/2, OpenAPI verification, and clean-worktree checks passed. The clone reached the same final commit SHA.

## GitHub evidence

- Repository: `https://github.com/JoseAngelValadezBarajas/forge-org-tool`
- Visibility: public.
- Default branch: `main`.
- Quality workflow: [run 39387177955](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39387177955) passed for the current reconstruction branch at verification commit `c218406`; web, API, Windows desktop Cargo/Tauri tests, and desktop launcher tests passed.

## Design-system reconstruction — latest local verification

- Canonical registry validation accounts for 100 Figma entries: 37 core families, 35 icons and 28 product patterns. All are mapped to owners, APIs, styles, tests and Component Host entries; the Button 40px minimum versus 36/38px reference remains documented as `PARTIAL`.
- `npm test` passed after the focused Tabs keyboard correction: architecture 23/23; web 42 files / 93 tests; UI 40 files / 67 tests; tokens 2/2; icons 35 files / 38 tests; API package contract 2/2; packed external consumer 1/1.
- `npm run lint:frontend` (zero warnings), `npm run format:check:web`, `npm run typecheck`, `npm run build`, isolated `npm run test:e2e` (Chromium desktop/mobile 18/18), Python Ruff, architecture checks and production `/__components` exclusion scan passed.
- The current screenshots include desktop and mobile Component Host in Dark and Light plus representative product journeys. They are automated browser evidence, not human visual certification. All 100 `visualReviewStatus` values remain `NOT_HUMAN_REVIEWED`.
- The independent reviewer found and the implementation fixed a Tabs disabled-first keyboard trap, with regression tests observed RED then GREEN. The parity registry validator now also checks code-only component paths.
- Clean-install verification: `npm ci` succeeds and the root `postinstall` builds tokens, icons, UI and API-client sequentially. GitHub Quality run [39562317882](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39562317882) exposed the prior parallel workspace-prepare race (`@forge-org/ui` tried to typecheck `@forge-org/icons` before generated declarations existed); that initial run failed in Web/Desktop at `npm ci` while API passed. The fix removes package-level parallel prepare builds, adds the ordered root build and a lifecycle-order regression test, and consolidates the duplicate root `@tauri-apps/cli` entry.
- Latest implementation snapshot: `67d15095cabd1b22958f931e971925ee45d44d05`. Verification-record commit: `68b90ca1f313292fc4435bd31d6eb36f3aaaea2f`. GitHub Quality run [39563427656](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39563427656) passed for the integrated branch; Web, API and Windows Desktop jobs all completed successfully, including Cargo formatting, Clippy, tests, release build, NSIS and installer smoke. Local Cargo remains unavailable; native evidence is from Windows CI.
- Final delivery commit `c0979f4fea769852c95486203e8a9940a73d5587` also passed Quality run [39564836420](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39564836420); all three jobs (Web, API, Windows Desktop) completed successfully.

## RED/GREEN notes

- API scaffold tests were already meaningful and passed before implementation changes; no artificial RED was manufactured.
- Focused Card contract tests first failed on the pre-existing `<section>` root; the typed neutral `div`/semantic option implementation produced 3/3 GREEN.
- Isolated Chromium smoke produced 18/18 GREEN and retained dark/light desktop/mobile evidence plus shell, planning detail, readiness/repository, delivery, workbench, and transfer truth-state coverage; hover behavior was checked in the browser.
- Clean-clone verification first exposed Windows line-ending sensitivity in token checks; `.gitattributes` fixed the repository-boundary defect and the fresh clone passed.

## Component structure and theme system — latest local verification

- Implementation commits: `d23e5aa` (canonical component directory cleanup), `8b13fee` (generated semantic and primitive token foundations), `350381d` (app theme provider, Component Host isolation and external consumer), `bc9b9b4` (contrast and pressed-state corrections), and `d75b281` (expanded interactive foreground contrast coverage). Final verified commit: `d75b281de5e3063a075072560c7cd4e25442cf53`. This initiative continues the existing PR #1 branch; it does not merge the PR.
- `npm test` passed: architecture checks 24/24; canonical design-system registry 100/100 (37 core, 35 icons, 28 product); generated token and contrast checks; OpenAPI-generated types unchanged; typecheck; Web 43 files / 99 tests; UI 40 files / 67 tests; tokens 8/8; icons 35 files / 38 tests; API-client package contract 2/2; packed React package consumer 1/1.
- RED/GREEN review correction: adding `textSecondary` on `statusNeutralBg` to the contrast test first failed at 4.35:1 in Light. The light neutral chip background changed from `#f0efed` to `#f4f3f1` (4.51:1); token tests and the 4.5:1 gate then passed. The Button pressed-state browser assertion failed against the previous behavior; token-based pressed colors were added, then the UI package was rebuilt because Playwright consumes its compiled artifact. The assertion passed on desktop and mobile. Focus-visible and disabled selectors are unchanged. The contrast gate also covers the primary button foreground, button pressed surfaces, danger-hover foreground, secondary surface text, and neutral/status chips.
- `npm run format:check:web` passed. `npm run lint:frontend` passed with zero warnings. `npm run build` passed; Vite reports the existing 532 KB main JavaScript chunk warning. The production asset scan found no `/__components` route or Component Host UI text.
- Isolated Playwright used web port 5204 and API port 5304 with `reuseExistingServer: false` and strict web port binding: 18/18 Chromium desktop/mobile journeys passed. Host System preview followed emulated OS dark/light changes without changing or persisting the application's theme. The updated 20 category captures cover five categories × Dark/Light × desktop/mobile, alongside overview and product journey screenshots.
- `packages/tokens/tokens.json` is the source for generated CSS and now contains semantic Dark/Light variables plus primitive palette samples, typography, spacing, radius, borders, elevation, motion and responsive values. The 23-row Figma drift register is reconciled or explicitly left for human design decision; the two uncertain `surfaceInteractive`/`surfaceTag` variable identities and canonical approval of Light mode remain open. All registry visual statuses remain `NOT_HUMAN_REVIEWED`; screenshots are automated rendering evidence only.
- Theme state remains application-owned: the reusable UI package only exports the system preference hook; `apps/web` persists `dark | light | system`; the Component Host uses an isolated, non-persistent nested scope. The Tauri desktop app consumes this shared web application path; packaged desktop appearance was not independently smoke-tested in this local run and is left to Windows Quality CI.
- GitHub Quality CI [run 39606002636](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39606002636) passed for final commit `d75b281de5e3063a075072560c7cd4e25442cf53`: API, Web, and Windows Desktop jobs all completed successfully, including Cargo fmt/Clippy/tests, release build, NSIS installer, and installed-product smoke. No human visual certification is claimed.

## Verdict

`M1_READY_FOR_REVIEW` for the focused audit corrections. Automated behavior, migration, packaging, and native-build verification are complete. Component parity remains `IMPLEMENTED_NOT_REVIEWED`; this does not claim CRUD, real-data migration, an installed product smoke, feature parity, or Figma pixel parity.

## UX-01 follow-up

UX-01 automated evidence and its separate delivery verdict are recorded in
[docs/evidence/ux01/verification.md](../ux01/verification.md). The M1
certification above remains scoped to its original commit; UX-01 is
`UX_01_BLOCKED` pending completion of per-category host preview decomposition,
Cargo/Windows checks, and GitHub Quality CI. No human visual certification is
claimed.
