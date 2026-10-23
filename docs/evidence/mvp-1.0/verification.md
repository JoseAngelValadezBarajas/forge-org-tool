# FORGE Org Tool 1.0 local verification evidence

Verification was run in the isolated `feature/forge-mvp-1.0` worktree based on `d0f111022bc570eb5b25e9fb16c21b7a216b862f`. The branch is not merged. It does not claim native Desktop or remote CI success.

## Browser journeys

Command: `npm run test:e2e:full`.

Result: 24 passed, 0 failed, 0 flaky, Chromium desktop and mobile. Run ID: `forge-product-acceptance-7086753f-03cd-4260-b0ea-d60579e52154`. Coverage: Organization (2), Planning (5), Transfer (3), accessibility/shell (1), and Component Host (1) per browser project. The run uses allocated loopback servers with `reuseExistingServer: false` and a run-scoped disposable SQLite database.

Run-specific `playwright-results.json`, traces, and per-project screenshots are retained under ignored `test-results/product-acceptance/<run-id>/`. Updated review screenshots are retained here:

- `component-host-desktop-dark.png`
- `component-host-desktop-light.png`
- `component-host-mobile-dark.png`
- `component-host-mobile-light.png`
- `project-overview-desktop.png` / `project-overview-mobile.png`
- `epic-detail-desktop.png` / `epic-detail-mobile.png`

These images establish automated browser rendering only; they are not human Figma certification.

## Backend and frontend checks

Final local quality results:

- `npm test`: passed; architecture/design/token/API type checks, 31 architecture tests, 14 acceptance-tooling tests, 136 frontend tests, shared UI/token/icon/API-client suites and external package consumer.
- `npm run typecheck`: passed.
- `npm run lint:frontend`: passed with zero errors and warnings.
- `npm run format:check:web`: passed.
- `npm run build`: passed; production Component Host route/UI/fixture exclusion passed.
- `npm run check:acceptance:registry`: passed.
- `uv run --project apps/api --locked pytest -q`: 42 passed, 1 subtest passed; one existing Starlette/httpx deprecation warning.
- Ruff check, Ruff format check and mypy: passed.
- `uv run --project apps/api --locked python -m pytest apps/desktop/tests -q`: 9 passed, 1 subtest passed; these are synthetic tests only.
- `uv run --project apps/api --locked python tooling/scripts/export-openapi.py --check`: passed; generated TypeScript definitions match.

## Limitations and acceptance

- AC-08 contextual transfer is implemented and covered by `PA-TRN-003` and API tests: Project, Epic, Work Item and Task JSON scopes; preview/fingerprint/destination; UI imports/exports; and ZIP v2 project screenshots.
- Native installed Desktop GUI → API → SQLite → restart acceptance was not run. The host lacks Rust `cargo`; Rustfmt, Clippy, Tauri packaging and installed native GUI checks remain pending.
- GitHub Quality CI was not run yet. No CI result is inferred from local execution.
- AC-05/AC-07 native persistence and overall delivery remain blocked until eligible Windows acceptance is executed.
- Figma parity is not human-certified; screenshots are browser evidence only.

Overall status remains `MVP_BLOCKED` pending native Desktop/CI evidence.
