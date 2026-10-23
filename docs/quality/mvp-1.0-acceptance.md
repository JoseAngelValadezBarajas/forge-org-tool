# FORGE Org Tool 1.0 Acceptance Traceability

Statuses reflect the currently executed evidence, not estimated feature completeness. Browser screenshots document rendered layout; they are not human visual certification against Figma. The full product contract is in `docs/product/mvp-1.0.md`.

| AC                                  | Current status                     | Evidence and remaining gap                                                                                                                                                                                                                                                                                |
| ----------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Workspace and Projects          | PARTIAL                            | `PA-ORG-001/002` pass in Chromium desktop/mobile. Workspace create/select/archive/restore, project CRUD/archive/restore, active selection and reload persistence are exercised. A comprehensive multi-Workspace isolation journey remains to be added.                                                    |
| 2 — Project and Epic management     | PARTIAL                            | `PA-PLAN-001/003` pass desktop/mobile; Epic create, priority, tags, Project Board summary and detail navigation are covered. Epic editing/status transitions and the complete five-column Epic movement journey are not certified end-to-end.                                                             |
| 3 — Epic Board and Stories          | PARTIAL                            | `PA-PLAN-001/003/004` create persisted Story and Bug Work Items, navigate details, and verify API state. A full CRUD journey for Work Item metadata and legacy Feature compatibility remains incomplete.                                                                                                  |
| 4 — Criteria, Notes, Tags           | PARTIAL                            | `PA-PLAN-001` plus API/UI tests verify criterion creation/edit/reorder, safe multiline notes, and tag behavior. The browser journey does not yet prove the full workspace tag lifecycle and filtering/assignment across multiple Projects.                                                                |
| 5 — Bugs and screenshot attachments | PARTIAL                            | `PA-PLAN-004` uploads/views a synthetic screenshot and verifies persistence after reload; API tests exercise content/ownership/size/count validation; `PA-TRN-002` verifies ZIP screenshot transfer across Workspaces. Installed Desktop restart persistence is not verified.                             |
| 6 — Two five-column Boards          | PARTIAL                            | Work Item HTML drag-and-drop on desktop and accessible status selector on mobile are verified by `PA-PLAN-001`; persisted changes are checked. All five transitions and movement of Epics through all columns are not yet covered by browser acceptance.                                                  |
| 7 — Durable persistence and restart | PARTIAL                            | API SQLite migration/reconnect tests, isolated E2E reloads, and 9 Desktop sidecar/SQLite tests pass. No installed native GUI → API → SQLite → restart acceptance was run.                                                                                                                                 |
| 8 — Contextual import/export        | INCOMPLETE — BLOCKER               | Full Project JSON v1/v2 import/export and secure ZIP screenshot package pass (`PA-TRN-001/002`). Import/export scoped to Epic, multiple Stories/Bugs into an existing Epic, and Tasks into an existing Work Item is not implemented; contextual entry points and their preview/commit journey are absent. |
| 9 — Component Host                  | AUTOMATED PASS; VISUAL REVIEW OPEN | Component Host smoke passes in both browser projects and both themes; production build verifies route/UI/fixture exclusion. Current captures are browser evidence only; no human Figma visual certification is claimed.                                                                                   |

## Latest browser evidence

Full isolated Chromium run: 20 passed, 0 failed, 0 flaky across desktop and mobile. Run ID: `forge-product-acceptance-09de52cf-64a1-416f-8ce2-2a456261a1d9`. It covers Organization 2, Planning 4, Transfer 2, accessibility/shell 1, and Component Host 1 per browser project. Playwright uses run-scoped loopback servers with `reuseExistingServer: false` and a disposable SQLite database.

Retained screenshots under `docs/evidence/mvp-1.0/`:

- `component-host-desktop-dark.png`
- `component-host-desktop-light.png`
- `component-host-mobile-dark.png`
- `component-host-mobile-light.png`
- `project-overview-desktop.png` / `project-overview-mobile.png`
- `epic-detail-desktop.png` / `epic-detail-mobile.png`

The four Component Host screenshots are dark/light browser renders at desktop/mobile sizes. Product screenshots are browser layout evidence, not human visual certification.

## Verification commands

- `npm test`: passed; architecture/design/token/OpenAPI/type checks, 31 architecture tests, 14 acceptance-tooling tests, 136 web tests, shared package tests and external package consumer.
- `npm run test:e2e:full`: passed, 20/20 desktop/mobile journeys.
- `npm run build`: passed; production Component Host route/UI/fixture exclusion passed.
- `npm run lint:frontend`: passed with zero warnings.
- `uv run --project apps/api --locked pytest -q`: 40 passed, 1 subtest passed; one existing Starlette/httpx deprecation warning.
- Ruff check, Ruff format check, and mypy: passed.
- `uv run --project apps/api --locked python -m pytest apps/desktop/tests -q`: 9 passed, 1 subtest passed; synthetic tests only.
- OpenAPI export check: passed; generated TypeScript types match the backend contract.
- Rustfmt, Clippy, Tauri build/installer and GitHub Quality CI: not run. `cargo` is unavailable on this host and the implementation branch has not been pushed.

The goal remains `MVP_BLOCKED` until AC-08 contextual transfer is implemented and the eligible native Desktop/CI checks are completed or explicitly accepted as environment limitations. Do not report overall MVP completion based on the passing subset above.
