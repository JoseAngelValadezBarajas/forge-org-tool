# FORGE Org Tool 1.0 Acceptance Traceability

Statuses reflect executed evidence, not estimated feature completeness. Browser screenshots document rendering; they are not human visual certification against Figma. The full product contract is in `docs/product/mvp-1.0.md`.

| AC                                  | Current status                     | Evidence and remaining gap                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — Workspace and Projects          | AUTOMATED PASS                     | `PA-ORG-001/002` pass in Chromium desktop/mobile. The UI journeys create three Projects, create/switch Workspaces, verify isolation and reload selection, and exercise Workspace and Project archive/restore.                                                                                                                                                            |
| 2 — Project and Epic management     | AUTOMATED PASS                     | `PA-PLAN-001/003/005` verify Epic create, priority, tags, progress, detail navigation, editing, and all five persisted Epic workflow states.                                                                                                                                                                                                                             |
| 3 — Epic Board and Stories          | AUTOMATED PASS                     | `PA-PLAN-001/003/004/005` verify persisted Stories and Bugs, detail navigation, API state, and all five Work Item states; API migration/contract tests preserve legacy Feature compatibility.                                                                                                                                                                            |
| 4 — Criteria, Notes, Tags           | AUTOMATED PASS                     | `PA-PLAN-001` verifies criterion create/edit/reorder, safe multiline notes, Story tag assignment and tag filtering. API tests verify normalized tag CRUD, duplicate rejection, stable reuse across Projects, and Workspace isolation.                                                                                                                                    |
| 5 — Bugs and screenshot attachments | PARTIAL                            | `PA-PLAN-004` uploads/views a synthetic screenshot and verifies reload persistence; API tests exercise content/ownership/size/count validation; `PA-TRN-002` verifies ZIP screenshot transfer across Workspaces. Installed Desktop restart persistence is not verified.                                                                                                  |
| 6 — Two five-column Boards          | AUTOMATED PASS                     | `PA-PLAN-001` verifies Work Item desktop drag/drop and mobile accessible status selection. `PA-PLAN-005` moves Epics and Work Items through all five persisted states and reloads them.                                                                                                                                                                                  |
| 7 — Durable persistence and restart | PARTIAL — NATIVE ACCEPTANCE OPEN   | SQLite migration/reconnect tests, isolated E2E reloads, and 9 Desktop sidecar/SQLite tests pass. No installed native GUI → API → SQLite → restart journey ran.                                                                                                                                                                                                           |
| 8 — Contextual import/export        | AUTOMATED PASS                     | `PA-TRN-001/002/003` verify Project import into a Workspace; Epic with child Work Items into a Project; multiple Stories/Bugs into an Epic; Tasks into an existing Work Item; contextual JSON exports; and ZIP v2 screenshot transfer. API tests verify shared validation, generated IDs, relationships, destination-bound fingerprints and stale-destination rejection. |
| 9 — Component Host                  | AUTOMATED PASS; VISUAL REVIEW OPEN | Smoke passes desktop/mobile and Dark/Light; production build excludes the route/UI/fixtures. Captures are browser evidence only; no human Figma visual certification is claimed.                                                                                                                                                                                         |

## Latest browser evidence

Full isolated Chromium run: 24 passed, 0 failed, 0 flaky. Run ID: `forge-product-acceptance-7086753f-03cd-4260-b0ea-d60579e52154`. It covers Organization (2), Planning (5), Transfer (3), accessibility/shell (1), and Component Host (1) in each desktop/mobile project. Playwright uses run-scoped loopback servers with `reuseExistingServer: false` and disposable SQLite.

Retained screenshots under `docs/evidence/mvp-1.0/`:

- `component-host-desktop-dark.png`
- `component-host-desktop-light.png`
- `component-host-mobile-dark.png`
- `component-host-mobile-light.png`
- `project-overview-desktop.png` / `project-overview-mobile.png`
- `epic-detail-desktop.png` / `epic-detail-mobile.png`

These images are automated browser rendering evidence, not human Figma certification.

## Verification commands

Final command results and the latest browser run are recorded in [`verification.md`](../evidence/mvp-1.0/verification.md). Rustfmt, Clippy, Tauri packaging, installed-GUI acceptance and GitHub Quality CI require a configured Rust/Windows runner and remote execution; none may be claimed passed without actual output.

AC-08 is implemented and automatically verified. Overall delivery remains `MVP_BLOCKED` until installed Desktop persistence and Windows/remote CI checks have actual evidence; synthetic sidecar tests do not establish native GUI acceptance.
