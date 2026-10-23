# FORGE Org Tool 1.0 Acceptance Traceability

Every criterion is verified with automated behavior/API evidence. Screenshots are browser layout evidence; they are not human visual certification against Figma.

| AC  | Required behavior                                                                                      | Primary automated evidence                                                                                                             | Status                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Workspace and Project CRUD, archive/restore, real active selector, reload persistence                  | `PA-ORG-001/002` Chromium desktop/mobile; Organization UI tests                                                                        | Partial: active selector/reload and Project create/update/archive/restore pass; Workspace create/update pass, Workspace archive missing                     |
| 2   | Epic Project Board with priority, tags and progress                                                    | `test_epic_priority_and_structured_bug_fields_persist`; EpicCard/Planning tests                                                        | Epic fields and UI composition implemented; dedicated current browser journey for tags/progress remains pending                                             |
| 3   | Epic Board persists Stories/Bugs and retains legacy Feature compatibility                              | `test_epic_priority_and_structured_bug_fields_persist`; migration and FeatureDetailPage tests                                          | Story/Bug persistence and structured fields are automated; dedicated browser journey and legacy-record product journey pending                              |
| 4   | Acceptance Criteria CRUD/reorder, safe notes, stable workspace-scoped normalized tags                  | `test_acceptance_criteria_edit_satisfy_reorder_and_delete`; workspace tag API/UI tests; FeatureDetailPage tests                        | API CRUD/reorder and normalized tag lifecycle pass; safe text notes and UI actions exist, but dedicated end-to-end journey is pending                       |
| 5   | Structured Bug fields and safe bounded PNG/JPEG/WebP attachments                                       | `test_bug_attachments_are_validated_scoped_persistent_and_removable`; FeatureDetailPage attachment test                                | PNG signature/MIME, scope, reopen persistence, removal and UI upload are covered; max-count/5MiB boundaries and desktop restart journey need explicit tests |
| 6   | Five persisted statuses, drag interaction and accessible selector; archive separate                    | `test_legacy_epic_statuses_migrate_to_workflow_and_separate_archive`; `test_epic_status_contract_preserves_source_and_existing_values` | Five workflow columns/selectors and separate archive are implemented; drag-and-drop is not implemented                                                      |
| 7   | State survives web/API/Desktop restart through SQLite; no production seeding                           | API migration tests; `apps/desktop/tests/test_installed_smoke.py` and sidecar launcher tests; isolated E2E fixture                     | API/sidecar synthetic restart tests pass; installed native GUI/UI→API→SQLite acceptance remains unverified                                                  |
| 8   | v2 transfer, v1 compatibility, one validator, atomicity, refs/tags/fingerprint and secure ZIP fixtures | `test_project_transfer_v2_preserves_tags_notes_bug_fields_and_v1_compatibility`; `PA-TRN-001`                                          | v1/v2 JSON and fingerprints pass; attachment ZIP package import/export and malformed archive security are not implemented                                   |
| 9   | Development-only `/__components`; only in-scope shared/product previews                                | Component Host Playwright; `check:production-host`                                                                                     | Route/scope/exclusion and dark/light desktop/mobile browser render are automated; no human Figma visual certification is claimed                            |

## Latest local browser evidence

Latest full in-scope Chromium run: 16/16 journeys passed across desktop and mobile (Organization 2, Planning 3, Transfer 1, accessibility/shell 1, Component Host 1 per project). Run ID: `forge-product-acceptance-cdb91643-e004-4f58-84c5-010534dcc841`. Earlier failed run `forge-product-acceptance-958ccc8e-3c40-438d-801c-96b49156daf8` exposed stale E2E labels/schema expectations; these were corrected without reducing assertions. Latest isolated Component Host smoke: 2/2, run ID `forge-product-acceptance-aa66d110-795c-4d31-94fc-6521ed6487fb`.

Retained screenshots from that run:

- Component Host: `docs/evidence/mvp-1.0/component-host-{desktop,mobile}-{dark,light}.png`
- Project Overview: `docs/evidence/mvp-1.0/project-overview-{desktop,mobile}.png`
- Epic detail: `docs/evidence/mvp-1.0/epic-detail-{desktop,mobile}.png`

These screenshots establish rendered browser behavior/layout only. They are not a human review or certification against Figma. The four Component Host captures were refreshed after the latest run; Product Overview and Epic detail captures remain from the earlier passing browser run.

## Baseline at implementation start

- Commit: `d0f111022bc570eb5b25e9fb16c21b7a216b862f` (`origin/main`).
- `npm ci`: passed; 388 packages added, audit reported 0 vulnerabilities. npm emitted a deprecation notice for the existing pinned ESLint version.
- `npm test`: passed on baseline (architecture/design-system/token/type checks; 60 frontend test files / 186 tests; shared token/UI/icon and API-client package checks; external-consumer package test).
- `uv run --project apps/api --locked pytest -q`: passed (33 tests, 1 subtest); one existing Starlette `httpx` deprecation warning.
- Local Rust toolchain: `cargo` not found; Rust formatting/Clippy/native builds require a configured runner or CI.

## Reporting rules

Do not change `Pending` to automated pass without named tests and retained results. Record browser dimensions, theme and screenshot paths separately. Record Figma mapping as `IMPLEMENTED_NOT_REVIEWED` unless a human reviewer inspected the exact referenced nodes and evidence. A green installer build is not native GUI acceptance; GUI acceptance requires visible window and UI/API/SQLite/restart evidence.
