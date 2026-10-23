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
- [x] Task 4: versioned Project Transfer (v1/v2 JSON and ZIP screenshot package; shared fingerprint guard, atomic project/attachment metadata import, path/symlink/checksum/image/size/count defenses, typed client, UI flow and desktop/mobile browser journey)
- [x] Task 5: Workspace and Project CRUD (create/update/select/reload persistence and archive/restore implemented; browser journeys pass on desktop/mobile)
- [ ] Task 6: Planning, Criteria, Bugs, and status workflow (persisted Epics/Stories/Bugs, tags, criteria CRUD/reorder, notes, attachments and Work Item drag/accessibility selector implemented; all five transitions, Epic movement and complete tag lifecycle still need acceptance coverage)
- [x] Task 7: Component Host and capability inventory (host now covers retained patterns only; development route and production exclusion verified)
- [ ] Task 8: clean-checkout and release verification (local web/API and isolated browser journeys pass; native Tauri GUI acceptance, Rust toolchain/GitHub CI and remaining product acceptance remain)

## Latest implementation checkpoint

- Existing-schema upgrade keeps a synthetic legacy Decision row. Online backup is SQLite-consistent, integrity-checked, and published atomically; simulated publication interruption leaves the original DB unchanged and retry succeeds. Reopening a migrated DB is safe. Future schema version remains unmodified.
- Organization active workspace is restored from and written to `localStorage`; a focused RED test confirmed the default-selection bug before implementation. `PA-ORG-001` verifies reload persistence on desktop and mobile.
- Retired UX-02 screenshots/journeys tied to removed modules were retired. Latest full isolated E2E run passes 20/20 across Chromium desktop/mobile; Component Host has four retained dark/light desktop/mobile captures.
- `npm test`: pass (31 architecture tests, 14 acceptance-tooling tests, 136 web tests, shared packages, API client contracts and external consumer).
- `npm run build`: pass, including `/__components` production exclusion. `npm run lint:frontend` (zero warnings) and `npm run typecheck`: pass.
- Backend: `uv run --project apps/api --locked pytest -q` passes 40 tests + 1 subtest; Ruff check/format and mypy pass. Desktop synthetic sidecar/SQLite tests pass 9 tests + 1 subtest.
- One frontend ESLint issue (synchronous effect state reset) was fixed by keying the workspace panel on workspace identity; no lint rule was weakened.
- Remaining blockers are contextual Epic/Work Item/Task import/export (AC-08), complete five-transition/Epic Board journey coverage (AC-06), installed native Desktop acceptance (AC-07), unavailable Rust toolchain checks and remote GitHub Quality CI. Do not report the product goal complete while these remain.
- Local implementation commit: `d03437a3e022781b5933135a1ec736c07cc5c562`; evidence-record commit follows. Branch is still local and has not been pushed or opened as a PR.
- Task 4 continuation: v2 ZIP package now exports/imports Bug screenshots through the Transfer UI. API round-trip, cross-workspace durability, traversal, symlink, checksum, attachment count/size, and isolated Chromium desktop/mobile PA-TRN-002 checks pass. Contextual imports remain unimplemented. OpenAPI contract and generated TypeScript types include package endpoints.
- The `executing-plans` task-start script is not runnable here because `bash` resolves to a Windows WSL launcher and the configured distro is unavailable. Plan task 4 was resumed directly from its checked-in task section; no task brief was fabricated.
