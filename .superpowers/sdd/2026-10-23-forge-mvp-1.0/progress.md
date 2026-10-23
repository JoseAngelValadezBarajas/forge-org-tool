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
- [x] Task 4: versioned Project and contextual Transfer (v1/v2 Project JSON, Epic/Work Item/Task JSON scopes, destination-bound preview fingerprints, shared validation/atomic writes, ZIP screenshot package, typed client, contextual UI entry points and desktop/mobile journeys)
- [x] Task 5: Workspace and Project CRUD (create/update/select/reload persistence and archive/restore implemented; browser journeys pass on desktop/mobile)
- [x] Task 6: Planning, Criteria, Bugs, and status workflow (persisted Epics/Stories/Bugs, workspace-scoped normalized tags and filtering, criteria CRUD/reorder, notes, attachments, drag/accessibility selector and all five Epic/Work Item transitions covered)
- [x] Task 7: Component Host and capability inventory (host now covers retained patterns only; development route and production exclusion verified)
- [ ] Task 8: clean-checkout and release verification (local web/API and isolated browser journeys pass; native Tauri GUI acceptance, Rust toolchain/GitHub CI and remaining product acceptance remain)

## Latest implementation checkpoint

- Existing-schema upgrade keeps a synthetic legacy Decision row. Online backup is SQLite-consistent, integrity-checked, and published atomically; simulated publication interruption leaves the original DB unchanged and retry succeeds. Reopening a migrated DB is safe. Future schema version remains unmodified.
- Organization active workspace is restored from and written to `localStorage`; a focused RED test confirmed the default-selection bug before implementation. `PA-ORG-001` verifies reload persistence on desktop and mobile.
- Retired UX-02 screenshots/journeys tied to removed modules were retired. Latest full isolated E2E run passes 24/24 across Chromium desktop/mobile; Component Host, Project Overview and Epic detail captures are refreshed and retained.
- `npm test`: pass (31 architecture tests, 14 acceptance-tooling tests, 136 web tests, shared packages, API client contracts and external consumer).
- `npm run build`: pass, including `/__components` production exclusion. `npm run lint:frontend` (zero warnings) and `npm run typecheck`: pass.
- Backend: `uv run --project apps/api --locked pytest -q` passes 42 tests + 1 subtest; Ruff check/format and mypy pass. Desktop synthetic sidecar/SQLite tests pass 9 tests + 1 subtest.
- One frontend ESLint issue (synchronous effect state reset) was fixed by keying the workspace panel on workspace identity; no lint rule was weakened.
- Remaining blockers are installed native Desktop persistence acceptance (AC-07), unavailable local Rust toolchain checks and remote GitHub Quality CI. Do not report the overall product goal complete until Windows evidence is available.
- Implementation and verification evidence are committed on `feature/forge-mvp-1.0`; the branch remains unmerged. The current commit and remote CI state must be reported from live Git evidence.
- Task 4 continuation: v2 ZIP package exports/imports Bug screenshots through the Transfer UI. API round-trip, cross-workspace durability, traversal, symlink, checksum, attachment count/size, and isolated Chromium desktop/mobile PA-TRN-002 checks pass. PA-TRN-003 verifies Project, Epic, Work Item and Task import/export through contextual UI destinations. OpenAPI contract and generated types include contextual endpoints.
- The `executing-plans` task-start script is not runnable here because `bash` resolves to a Windows WSL launcher and the configured distro is unavailable. Plan task 4 was resumed directly from its checked-in task section; no task brief was fabricated.
