# FORGE Org Tool 1.0 execution ledger

- Base: `d0f111022bc570eb5b25e9fb16c21b7a216b862f`
- Branch: `feature/forge-mvp-1.0`
- Spec: `docs/product/mvp-1.0.md`
- Plan: `docs/superpowers/plans/2026-10-23-forge-mvp-1.0.md`

## Baseline evidence

- `npm ci`: pass; 388 packages installed, 0 vulnerabilities. Existing ESLint deprecation notice.
- `npm test`: pass; 60 Vitest files / 186 frontend tests, 30 architecture tests, 14 acceptance-tooling tests, all package/UI/API contract and external consumer checks pass.
- `uv run --project apps/api --locked pytest -q`: pass; 33 tests + 1 subtest. Existing Starlette/httpx deprecation warning.
- `cargo`: unavailable on this Windows host; native Rust checks are delegated to configured CI.
- Characterization: baseline API/OpenAPI contract equality is enforced in `test_backend_boundaries.py`; migration tests cover fresh v2, synthetic v1 upgrade, and future-version no-mutation. Existing fresh schema still creates all legacy capability tables; Phase B must add the 1.0 active-schema assertion.

## Tasks

- [x] Task 1: contract and baseline characterization (docs + baseline test evidence; implementation tests pass at `d0f1110`)
- [x] Task 2: retire unsupported active capabilities (active routes/API types/UI/product previews and retired tests removed; architecture/package contracts pass)
- [x] Task 3: active schema and safe migrations (fresh DB excludes legacy tables; upgrade preserves historical rows; integrity-checked online backup, interrupted-backup retry, replay, and future-schema safety tested)
- [ ] Task 4: versioned Project Transfer (v1/v2 JSON, shared validation/fingerprint, atomicity and tags implemented; secure ZIP attachment transport remains)
- [ ] Task 5: Workspace and Project CRUD (Workspace create/update and Project lifecycle implemented; Workspace archive/restore remains)
- [ ] Task 6: Planning, Criteria, Bugs, and status workflow (persisted Epics/Stories/Bugs, normalized tags, criteria CRUD/reorder, notes, structured Bugs and persistent attachments implemented; drag-and-drop and remaining boundary/journey coverage remain)
- [x] Task 7: Component Host and capability inventory (host now covers retained patterns only; development route and production exclusion verified)
- [ ] Task 8: clean-checkout and release verification (local web/API and isolated browser journeys pass; native Tauri GUI acceptance, Rust toolchain/GitHub CI and remaining product acceptance remain)

## Latest implementation checkpoint

- Existing-schema upgrade keeps a synthetic legacy Decision row. Online backup is SQLite-consistent, integrity-checked, and published atomically; simulated publication interruption leaves the original DB unchanged and retry succeeds. Reopening a migrated DB is safe. Future schema version remains unmodified.
- Organization active workspace is restored from and written to `localStorage`; a focused RED test confirmed the default-selection bug before implementation. `PA-ORG-001` verifies reload persistence on desktop and mobile.
- Retired UX-02 screenshots/journeys tied to removed modules were retired. Current full in-scope E2E run passes 16/16 across Chromium desktop/mobile after updating labels and the expected v2 export schema. Isolated smoke passes 2/2.
- `npm test`: pass (architecture/design/token/API type checks, 14 acceptance-tooling tests, 132 web tests, shared packages, API client contracts and external consumer).
- `npm run build`: pass, including `/__components` production exclusion. `npm run lint:frontend` and `npm run typecheck`: pass.
- Backend: `uv run --project apps/api --locked pytest -q` passes 38 tests + 1 subtest; Ruff check/format and mypy pass. Desktop synthetic sidecar/restart tests pass 9/9.
- One frontend ESLint issue (synchronous effect state reset) was fixed by keying the workspace panel on workspace identity; no lint rule was weakened.
- Component Host screenshots from the first smoke run are run-scoped/ignored. Refresh and retain review screenshots under `docs/evidence/mvp-1.0/` before final review.
- Remaining product gaps are explicit: Workspace archive/restore, accessible drag-and-drop, transfer ZIP attachments and hostile-archive cases, explicit attachment size/count boundary tests, expanded current browser journeys, and native installed Tauri GUI acceptance. `cargo` is absent and GitHub CI has not run because branch has not been pushed. Do not report the product goal complete while these remain.
