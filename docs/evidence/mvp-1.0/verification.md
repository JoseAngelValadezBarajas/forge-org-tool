# FORGE Org Tool 1.0 verification evidence

## Epic legacy-status regression hotfix (2026-10-23)

Reproduced against a disposable v2 SQLite database with the old `epics.status DEFAULT 'planning'` schema, migrated using the production runner: `create_epic()` omitted status, SQLite persisted `planning`, and FastAPI raised `ResponseValidationError` at `('response', 'status')` because the response contract accepted only `backlog`, `ready`, `in_progress`, `verify`, or `done`. The POST returned HTTP 500 after the row had already been committed. This confirms the reported cause; the reproduction did not use or modify installed user data.

Migration v5 (`v0005_epic_status_normalization`) is forward-only and UPDATE-only: `planning` becomes `backlog`, `planned` becomes `ready`; other values and row identities remain untouched. It does not delete or deduplicate Epics, modify archive metadata, or unarchive records. The existing integrity-checked pre-migration backup remains in use. New Epics explicitly insert `backlog`, regardless of the legacy SQLite column default. Response reads tolerate unknown persisted status strings, and Planning presents them in a recovery region rather than dropping them. Summary counts reconcile workflow, archived, and legacy Epics.

The synthetic upgraded-browser fixture contained four existing Epics: two status remaps, one archived Epic, and one unsupported custom-state Epic. Migration affected exactly two records; it preserved all four rows, archive state, identity, and the unsupported state. Browser acceptance created `testing` as a fifth Epic, returned HTTP 201, immediately displayed it in Backlog without reload, and reconciled the summary to 5 total (3 workflow, 1 archived, 1 legacy). A failed invalid-tag create returned 422 and left no Epic or tag record. No duplicate or user record was removed.

Retained upgraded-database browser screenshot: [epic-legacy/upgraded-epic-board.png](epic-legacy/upgraded-epic-board.png) (synthetic data; automated browser evidence, not human visual certification). The installed smoke implementation was traced to isolated temporary `LOCALAPPDATA`/disposable database setup; no product smoke path was changed, and no installed application database was used by these regression tests. PR #3 remains open and unmerged.

Local verification for implementation commit `940d6a487f48976330f048525a8b4fa40d4a70bd`: API pytest 39 passed (one existing Starlette/httpx deprecation warning); frontend Vitest 141 passed; TypeScript typecheck passed; Ruff and mypy (58 source files) passed; architecture checks passed; production build and development-route exclusion passed; isolated Playwright passed 24 journeys desktop/mobile, plus the dedicated upgraded legacy SQLite Chromium journey passed. The first GitHub Quality run [39981131071](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39981131071) passed API, Rustfmt, Clippy, and Rust tests, but Desktop smoke unit tests exposed two test/infrastructure issues: the old smoke assertion expected migration v4, and `_schema_is_current` used a SQLite context manager that did not close its connection, keeping test databases locked on Windows. Both are fixed in the follow-up commit; rerun CI is pending. Local Cargo is unavailable, so Rust verification is from the Windows CI runner.

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
