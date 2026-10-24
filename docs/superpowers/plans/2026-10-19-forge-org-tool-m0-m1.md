# FORGE Org Tool M0/M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the original FORGE repository and publish a clean, independently verifiable FORGE Org Tool M1 foundation.

**Architecture:** M0 uses the existing preservation script and read-only inventory to create an external verified Git bundle. M1 remains a clean npm/uv monorepo with a FastAPI bootstrap endpoint, React shell, reusable UI packages, executable boundaries, and development-only browser gallery. Publication occurs only after generated locks, quality checks, public-file audit, clean Git history, and a human staged-file review.

**Tech Stack:** Node 24/npm 11, React 19, TypeScript, Vite, React Router, Vitest/Testing Library/Playwright Chromium where required, Python 3.12, uv, FastAPI, Pydantic, pytest, Ruff, strict mypy, GitHub Actions, GitHub CLI.

**Spec:** `docs/specs/M0-preservation/spec.md`, `docs/specs/M1-foundation/spec.md`, `docs/specs/M0-preservation/acceptance.md`, `docs/specs/M1-foundation/acceptance.md`

## Global Constraints

- The original `JoseAngelValadezBarajas/Forge` repository is preserved and not archived, renamed, deleted, force-pushed, or otherwise modified by M0/M1.
- PR #30 is not merged or rewritten; preserve its current exact remote head and branch refs. Current observed head is `616533bdf82cec376e0ecfb9e956a6a8b8dfe005`; current `origin/main` is `cadc4223d3c08c793b4f39152108997b697a7a75`.
- The new repository is public from its first commit and has independent Git history.
- Never track credentials, secrets, `.env`, real SQLite databases, user files, attachments, production logs, private backups, employer material, or machine-specific private paths.
- M1 does not implement Organization/Planning CRUD, real-data migration, Tauri runtime, sidecar packaging, or feature parity.
- `packages/tokens` is foundational; `packages/ui` is generic and public-barrel-only; `packages/api-client` is transport-only; app and features own composition/business presentation.
- Figma is design intent. Page 19 informs reusable UI, page 20 informs feature patterns; 23 known token drifts remain unresolved and no pixel-parity claim is allowed.
- Manual planning state and REPORTED evidence are never described as VERIFIED, CI-passed, deployed, or production-ready.

## Review Focus

- Legacy worktree has uncommitted changes: preserve and report status instead of implying a clean source baseline; test: M0 status capture and manifest review (Task 1).
- PR #30 is already merged despite the original RFC wording: preserve current branch/head refs without attempting a merge; test: current `gh pr view`/`ls-remote` evidence and baseline record (Task 1).
- Production frontend must not expose the development gallery: test production build route absence and asset inspection (Task 3).
- Loading/disabled buttons must block native interaction and expose accessible state: test click behavior and `aria-busy`/disabled semantics (Task 3).
- OpenAPI drift or undocumented CRUD routes must block publication: test export check and route inventory (Task 2).

---

### Task 1: M0 preservation and independent workspace

**Files:**
- Create: `docs/migration/original-forge-baseline.md`
- Create: `docs/migration/migration-boundaries.md`
- Modify: `docs/specs/M0-preservation/acceptance.md`
- Preserve externally: verified Git bundle, SHA256, and JSON manifest under an operator backup directory outside all worktrees
- Copy: current scaffold into the approved new repository directory without copying `.git` history (target must be absent before copy)

**Interfaces:**
- Consumes: current legacy checkout, `tooling/scripts/preserve-legacy.ps1`, current GitHub/remote refs.
- Produces: external preservation manifest/bundle paths and baseline facts consumed by publication reporting; independent M1 workspace.

- [ ] **Step 1: Write the failing/validation check**

  Add acceptance assertions to the baseline checklist for expected origin, current `origin/main`, PR #30 head branch/SHA, status capture, bundle verification, and data exclusion. Configuration-only preservation work uses a validation checklist instead of an artificial code RED test.

- [ ] **Step 2: Run the preservation validation before implementation**

  Run read-only `git -C <legacy> status --porcelain=v1`, `git -C <legacy> remote -v`, `git -C <legacy> ls-remote origin ...`, and `gh pr view 30 ...`; expected: evidence reflects the current remote, including PR #30 already merged and branch head `616533b...`.

- [ ] **Step 3: Run the preservation script**

  Run `tooling/scripts/preserve-legacy.ps1 -LegacyPath <absolute legacy path> -BackupDirectory <absolute external backup directory>` from the scaffold. Expected: a complete bundle, successful `git bundle verify`, SHA256, and JSON manifest outside worktrees; no database or user files included.

- [ ] **Step 4: Inventory legacy contracts and limitations**

  Record HTTP OpenAPI files, Alembic revisions, Python/React/Rust lockfiles/packages, Figma IDs, shipped runtime assumptions, local-data locations, and CI limitations in `docs/migration/original-forge-baseline.md`. Record the later migration protocol and separate application-data boundary in `docs/migration/migration-boundaries.md`.

- [ ] **Step 5: Create the independent workspace**

  Copy the scaffold contents to the approved new repository directory only after confirming the target is absent; exclude `.git`, local caches, databases, logs, and private backups. Confirm the new tree has no legacy Git history and the legacy checkout remains unchanged.

- [ ] **Step 6: Verify Task 1**

  Re-run the preservation evidence checks, inspect the external manifest and bundle verification result, compare legacy status before/after, and run `git diff --check` on the new workspace. Expected: M0 acceptance evidence exists and no legacy mutation is observed.

- [ ] **Step 7: Commit**

  Initialize no new Git history yet; commit is deferred to Task 4 after the public-file audit and lockfile generation.

### Task 2: M1 dependency locks, API contract, and CI baseline

**Files:**
- Create: `package-lock.json`
- Create: `apps/api/uv.lock`
- Modify: `apps/api/pyproject.toml` only if checks expose a real configuration defect
- Modify: `contracts/openapi/forge-org-v1.json` only through the export script when backend contract changes
- Modify: `.github/workflows/quality.yml` only for observed missing quality gates
- Test: `apps/api/tests/test_health.py`

**Interfaces:**
- Consumes: independent workspace and M1 API specification.
- Produces: reproducible npm/uv environments and backend contract evidence consumed by Tasks 3â€“4.

- [ ] **Step 1: Write/confirm API tests first**

  Ensure tests assert exact `GET /api/v1/health` JSON, HTTP 200, and 404 for an unimplemented domain route. Add an OpenAPI route assertion if export output does not already make absence explicit.

- [ ] **Step 2: Run the API tests RED or document existing GREEN**

  Run `uv run --project apps/api pytest apps/api/tests -q` before changing API code. If the existing bootstrap tests pass, record that the scaffold already satisfies this behavior and do not manufacture a failing test.

- [ ] **Step 3: Generate lockfiles**

  Run `npm install` at the workspace root and `uv lock --project apps/api`. Expected: committed `package-lock.json` and `apps/api/uv.lock`; no `Cargo.lock` because Tauri is reserved.

- [ ] **Step 4: Verify API quality and contract**

  Run `uv run --project apps/api ruff check apps/api/src apps/api/tests`, `uv run --project apps/api mypy apps/api/src`, `uv run --project apps/api pytest apps/api/tests`, and `uv run --project apps/api python tooling/scripts/export-openapi.py --check`. Expected: all pass and health scope remains `bootstrap-only`.

- [ ] **Step 5: Verify CI configuration**

  Inspect workflow commands against the generated lockfiles and run the same commands locally. Add only missing M1 checks; do not weaken assertions or claim remote CI success before GitHub runs.

- [ ] **Step 6: Commit**

  Commit lockfiles and any narrowly required API/CI corrections with `chore: lock M1 bootstrap environments`.

### Task 3: M1 frontend interaction, gallery, and browser evidence

**Files:**
- Modify: `package.json`, `apps/web/package.json`
- Modify: `apps/web/src/app/App.tsx` and gallery files only for observed UI defects
- Modify: `packages/ui/src/primitives/Button.tsx` and related CSS/tests if interaction semantics need correction
- Create: focused Vitest/Testing Library tests under `apps/web/src/**/*.test.tsx` or the established test directory
- Create: Playwright smoke configuration/spec under `apps/web/e2e/` or the established E2E location
- Modify: `.gitignore` for browser artifacts if needed

**Interfaces:**
- Consumes: public UI barrels, token CSS, M1 frontend specification, and Task 2 lockfile.
- Produces: tested shell/gallery behavior and retained Chromium evidence for Task 4 reporting.

- [ ] **Step 1: Write focused frontend tests first**

  Add tests for the truthful `/` empty state, Button loading/disabled native behavior and accessible state, gallery counter interaction, and theme switch from dark to light. Tests must use public `@corefoundry-labs/forge-ui` exports and make no API calls.

- [ ] **Step 2: Run focused tests RED**

  Run the focused Vitest command. Expected: tests fail only for missing test tooling or an actual specified behavior gap; distinguish infrastructure failures from implementation failures and record any ruling.

- [ ] **Step 3: Implement the minimal behavior**

  Add only the required test runner/config and fix actual behavior gaps. Keep gallery route guarded by `import.meta.env.DEV`, keep UI generic, and preserve provisional-token copy and no-backend-call behavior.

- [ ] **Step 4: Run focused tests GREEN**

  Run the focused Vitest/RTL command and record the pass count. Then run `npm run typecheck` and `npm run build`.

- [ ] **Step 5: Add and run Chromium smoke**

  Start the dev server with an isolated process, run desktop and mobile Chromium checks for `/` and the dev gallery, verify theme interaction, console errors, and horizontal overflow. Build production assets and verify the gallery route/label is absent from the production output.

- [ ] **Step 6: Commit**

  Commit the focused frontend test and behavior work with `test: verify M1 shell and component gallery`.

### Task 4: Architecture/security audit, public Git history, publication, and final verification

**Files:**
- Modify: `docs/specs/M1-foundation/traceability.md`
- Modify: `README.md`, `CONTRIBUTING.md`, or architecture docs only where observed implementation/evidence differs
- Create: milestone evidence report outside tracked source if it contains private backup paths; tracked report must contain only safe references/hashes

**Interfaces:**
- Consumes: M0 manifest, lockfiles, API/frontend evidence, architecture scripts, and GitHub CLI auth.
- Produces: independent public repository URL, main SHA, CI evidence, clean clone evidence, and final M1 verdict.

- [ ] **Step 1: Write audit checks first**

  Define the tracked-file audit command set: `git ls-files`, secret-pattern scan, forbidden-file scan, `npm run check:architecture`, `npm run test:architecture`, `npm run check:tokens`, `git diff --check`, and API/frontend quality commands. Add tests only for concrete boundary gaps.

- [ ] **Step 2: Run the audit RED/diagnostic pass**

  Run all checks before publication. Expected: failures identify actual gaps; do not suppress or weaken checks. Fix only M1-scoped issues, recording deviations in the traceability/ADR documents.

- [ ] **Step 3: Run the complete local gate**

  Run `npm run generate:tokens`, `npm run check:tokens`, `npm run check:architecture`, `npm run test:architecture`, `npm run typecheck`, `npm run build`, API Ruff/mypy/pytest/OpenAPI checks, and the Chromium smoke. Expected: all local gates pass with counts recorded.

- [ ] **Step 4: Initialize clean Git history**

  Confirm staged files contain no private data or legacy `.git`, run `git init -b main`, stage only reviewed files, inspect `git diff --cached --stat` and `git diff --cached`, then commit `chore: initialize public FORGE Org Tool foundation`. Do not add external bundles or manifests.

- [ ] **Step 5: Publish only after human review gate**

  Run `tooling/scripts/publish-public.ps1` from the clean main branch after the staged-file review. This is an external side effect and must stop if the script or GitHub CLI reports a blocker; never pretend publication succeeded.

- [ ] **Step 6: Verify public repository and CI**

  Query repository visibility, URL, main SHA, and workflow status with `gh`; clone the public repository into a clean temporary directory; run lockfile/bootstrap checks there. Record observed results, not assumptions.

- [ ] **Step 7: Update traceability and final verdict**

  Update M1 traceability with exact commands/counts, record known limitations (provisional tokens, no Tauri/Cargo.lock, no CRUD/data migration), and report `M1_READY_FOR_REVIEW` only if every definition-of-done item is evidenced; otherwise report `M1_BLOCKED` with concrete blockers.

- [ ] **Step 8: Commit evidence documentation**

  If safe tracked documentation changed after the initial commit, commit it on main and verify the final SHA/CI again; do not rewrite or force-push history.

---

## Plan self-review

- M0 requirements are covered by Task 1; M1 API/tooling by Task 2; UI/browser by Task 3; architecture/security/publication by Task 4.
- The current PR #30 merged state is handled as observed history, not as a command to merge or rewrite.
- No task introduces CRUD, data migration, Tauri, or token-parity claims outside M1 scope.
- Tests cover health contract, route absence, truthful shell, shared interaction semantics, gallery/theme behavior, production absence, boundaries, token drift, and public-file safety.
- Publication and legacy preservation are explicitly gated external operations; failures produce `M1_BLOCKED` rather than inferred success.
