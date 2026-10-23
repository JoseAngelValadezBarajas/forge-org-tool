# FORGE Org Tool 1.0 local verification evidence

Verification was run in the isolated `feature/forge-mvp-1.0` worktree based on `d0f111022bc570eb5b25e9fb16c21b7a216b862f`. The implementation and verification commits are recorded in Git; this document intentionally does not claim the native Desktop or remote CI checks passed.

## Browser journeys

Command: `npm run test:e2e:full`.

Result: 20 passed, 0 failed, 0 flaky, Chromium desktop and mobile. Run ID: `forge-product-acceptance-09de52cf-64a1-416f-8ce2-2a456261a1d9`. Coverage includes Organization (2), Planning (4), Transfer (2), accessibility/shell (1), and Component Host (1 in each browser project). The run uses allocated loopback ports, `reuseExistingServer: false`, and a run-scoped disposable SQLite database.

Latest run artifacts, including `playwright-results.json`, traces, and per-project screenshots, are retained in the ignored `test-results/product-acceptance/<run-id>/` directory. Reviewable screenshot files are retained in this directory:

- `component-host-desktop-dark.png`
- `component-host-desktop-light.png`
- `component-host-mobile-dark.png`
- `component-host-mobile-light.png`
- `project-overview-desktop.png` / `project-overview-mobile.png`
- `epic-detail-desktop.png` / `epic-detail-mobile.png`

These screenshots establish browser rendering only and do not imply human visual review against Figma.

## Backend and frontend checks

- `npm test`: passed; architecture/design/token/OpenAPI/type checks, 31 architecture tests, 14 acceptance-tooling tests, 136 frontend tests, shared package tests and external package consumer.
- `npm run typecheck`: passed.
- `npm run lint:frontend`: passed with zero warnings.
- `npm run build`: passed, including production exclusion of the Component Host route, UI and synthetic fixtures.
- `npm run test:e2e:full`: passed, 20/20 browser journeys.
- `uv run --project apps/api --locked pytest -q`: 40 passed, 1 subtest passed; existing Starlette/httpx deprecation warning.
- Ruff check, Ruff format check and mypy: passed.
- `uv run --project apps/api --locked python -m pytest apps/desktop/tests -q`: 9 passed, 1 subtest passed. These are synthetic sidecar/SQLite tests, not an installed GUI test.
- `uv run --project apps/api --locked python tooling/scripts/export-openapi.py --check`: passed; regenerated TypeScript OpenAPI definitions match the backend contract.

## Limitations and acceptance

- AC-08 is incomplete: Project JSON and ZIP screenshot transfer are implemented, but contextual Epic, Work Item and Task import/export destinations and UI entry points are absent. See `docs/quality/mvp-1.0-acceptance.md`.
- No installed native Desktop GUI → API → SQLite → restart journey was run. The Windows host has no Rust `cargo` toolchain, so Rustfmt, Clippy, Tauri packaging and native installation were not run.
- GitHub Quality CI was not run because the implementation branch remains local.
- Figma parity is not human-certified; the retained screenshots are automated browser evidence only.

Therefore the correct overall status is `MVP_BLOCKED`, not complete.
