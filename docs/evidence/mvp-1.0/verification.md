# FORGE Org Tool 1.0 verification evidence

Final implementation commit: `534686ae38f9730aacff12c2dc0ea69e0fcef634` (`feature/forge-mvp-1.0`). PR [#3](https://github.com/JoseAngelValadezBarajas/forge-org-tool/pull/3) remains open and unmerged.

## GitHub Quality CI

Quality run [39968176409](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39968176409) passed all three jobs (`web`, `api`, `desktop`) for the final implementation commit. The run includes frontend formatting/lint/tests/build, isolated Chromium acceptance, Ruff/mypy/backend tests/OpenAPI compatibility, Rustfmt, Clippy, Rust tests, Tauri release build, and installed Windows NSIS acceptance.

The installed Windows test reported:

`PASS installed UI -> authenticated API -> SQLite -> restart; ... attachment='forge-desktop-bug.png' window='FORGE Org Tool' 1044x788 database='...\local-app-data\ForgeOrgTool\data\forge.db' ...`

It installed the NSIS package, confirmed the visible main window and title, used UI Automation to create a workspace, project, Epic and Bug, selected and uploaded a synthetic PNG through the native file picker, verified the per-user SQLite database, closed the application and sidecar, relaunched it, and verified the records and attachment rendered again. The recorded window size is runner/DPI-specific and exceeds the configured minimum dimensions.

Artifacts from that run:

- [Windows NSIS installer and native smoke screenshot](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39968176409/artifacts/12508766702) — `FORGE Org Tool_0.1.1_x64-setup.exe` and `forge-desktop-startup-v0.1.1-smoke.bmp`.
- [Browser acceptance evidence](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39968176409/artifacts/12507523428) — Playwright reports, traces, and screenshots.

## Browser and product acceptance

`npm run test:acceptance:local` passed 24/24 Chromium journeys on desktop and mobile, including the Component Host in Dark and Light themes, Organization, Planning, Bug screenshot upload, contextual transfer, and accessibility/shell coverage. The run uses isolated loopback servers and disposable SQLite. Its report is retained under the ignored `test-results/product-acceptance/local-2026-10-23T14-14-16-081Z-17516/`; the CI evidence artifact above preserves the CI run's browser report and screenshots.

The reviewed screenshot files in this directory document browser rendering only. Neither those captures nor the native smoke screenshot constitute human Figma visual certification. Figma visual review remains open.

## Local verification

- `npm test`: passed — architecture, design-system/token checks, OpenAPI type generation check, TypeScript, 38 architecture tests, 14 acceptance-tooling tests, 138 frontend tests, package/component tests, and external consumer test.
- `npm run lint:frontend`: passed with zero errors or warnings.
- `npm run format:check:web`: passed.
- `npm run build`: passed, including production Component Host route/UI/fixture exclusion.
- `npm run test:acceptance:local`: 24 passed, 0 failed, 0 flaky.
- Windows `desktop-window-contract.test.mjs`: 12 passed; PowerShell parser passed.
- Installed NSIS smoke was also executed locally against a CI-built installer with isolated `LOCALAPPDATA`; the full UI → API → SQLite → restart flow passed and its temporary install/data directory was cleaned by the test.

## Acceptance status and limits

Automated product acceptance is complete for AC-01–AC-09. AC-05 screenshot persistence and AC-07 durable restart persistence have installed Windows evidence, not just synthetic sidecar tests. AC-09's Component Host route exclusion and browser behavior are automated; visual Figma review is still a human review item.

Overall status: `MVP_READY_FOR_REVIEW`. This is readiness for human product/design review, not a claim of human Figma certification, PR approval, merge, release, or operator acceptance. PR #3 remains open and unmerged.
