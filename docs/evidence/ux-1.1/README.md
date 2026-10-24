# FORGE Org Tool 1.1 UX evidence

## Current browser comparison

The current comparison set is in `visual-parity/`: Figma references, freshly captured implementation images, per-pixel difference maps, 50% overlays, and machine-readable/Markdown reports. The generated files are automated evidence only. Every report remains `PENDING_HUMAN_REVIEW` and `VISUAL_FIDELITY_NOT_ACCEPTED`; a pixel-difference percentage is not a human parity verdict.

Regenerate both desktop and mobile captures in distinct isolated Playwright/SQLite runs, then compare all ten exact Figma frames:

```powershell
npm run test:e2e:ux11-visual
```

The fixture creates synthetic workspaces, projects, Epics, Stories, Bugs, tags, acceptance criteria, tasks, and image attachments in a disposable database. It does not read or write installed/operator application data. No screenshot masks are applied. Browser configuration: Chromium, 1440x960 desktop / 390x844 mobile, DPR 1, 100% zoom, bundled Inter, animations disabled.

| Figma node | Current exact pixel difference | Notes |
| --- | ---: | --- |
| 344:3 Workspace Home | 65,571 / 1,382,400 (4.74%) | Fresh automated comparison; remaining visual/content differences still require human review. |
| 344:82 Project Board (dark) | 43,780 / 1,382,400 (3.17%) | Fresh automated comparison; remaining board spacing/content differences still require human review. |
| 344:182 Epic Board | 85,953 / 1,382,400 (6.22%) | Figma summary says 6 items, 2 completed (33%), while its visible status lanes sum to 6 with only one Done card. Product counts remain derived from persisted records; the mismatch is not hard-coded away. |
| 347:54 Story Detail | 186,957 / 1,382,400 (13.52%) | Product behavior is captured; remaining visual/content hierarchy differences require review. |
| 347:145 Bug Detail | 83,816 / 1,382,400 (6.06%) | Structured reproduction and screenshot attachment are fixture-backed; visual differences remain. |
| 347:224 Create Epic | 176,066 / 1,382,400 (12.74%) | Desktop uses a contextual board-plus-drawer composition; it is not yet visually certified. |
| 347:308 Contextual Transfer | 501,636 / 1,382,400 (36.29%) | Transfer is a normal shell page (not a blocking modal), uses the shared FilePicker, and states the human-readable destination. The capture keeps the advanced JSON source closed after preview. Remaining copy, count, card geometry, and source-state differences require review. |
| 348:57 Workspace Tags | 281,215 / 1,382,400 (20.34%) | Tag usage counts are not present in the API and are not fabricated. |
| 348:129 Project Board (light) | 43,494 / 1,382,400 (3.15%) | Automated comparison only; exact color/typography/spacing review remains open. |
| 348:210 Mobile Epic Board | 120,164 / 329,160 (36.51%) | Principal geometry is asserted exactly in `DetailPages.spec.ts`. Figma omits the working `Move` and `Other workflow statuses` controls, which remain visible/functioning in product; the Figma summary count and inferred lane totals also need human resolution. |

All reports are under `visual-parity/reports/`; references, actuals, differences, and overlays are retained in their corresponding subdirectories. The 19-image `screenshots/` set is the earlier UX evidence set and is not the source used by the current pixel comparator.

## Native Windows acceptance

The native installed-app smoke is separate from browser/Figma evidence. A local reproduction was run against the previously downloaded CI NSIS installer using the corrected smoke harness and a unique disposable install and `LocalAppData` directory. It verified the visible `FORGE Org Tool` window (1216x839), UI → authenticated sidecar API → SQLite, synthetic workspace/project/Epic/Bug and screenshot attachment creation, persistence after restart, second-instance activation, graceful close, and sidecar cleanup. The synthetic database was under a temporary directory and did not touch operator application data. `desktop-installed-smoke.bmp` is the refreshed successful installed-application screenshot.

This local result validates the corrected native file-picker automation and installed workflow against that prior installer; it does **not** certify a newly built installer. The latest PR CI run before these local corrections (`40046707565`, commit `aa6dbe9`) passed API and Web but failed Desktop because the smoke expected a workspace label not exposed by the current UI. The corrected smoke now verifies the workspace in the isolated SQLite database and follows the current product flow. A fresh Windows Quality CI run must rebuild the installer and pass the installed acceptance job before the new package is considered verified. Neither native smoke nor browser pixel comparisons certify human Figma parity.
