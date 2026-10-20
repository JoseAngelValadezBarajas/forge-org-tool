# Codex Desktop · FORGE Org Tool / M0 + M1

You are working on Windows with operator-supplied local repositories. The owner has approved a **new public GitHub repository from the first commit** named `JoseAngelValadezBarajas/forge-org-tool`. The old public repository `JoseAngelValadezBarajas/Forge` must be **preserved, not archived yet**. Use the attached architecture RFC v0.2 and extracted `forge-org-tool-bootstrap.zip` as the baseline. Figma file `r10szKLgiIPVi2NBmbjTpm`: active page 19 for reusable UI, page 20 for feature-owned composed patterns.

## Non-negotiable rules

- Never overwrite, reset, force-push, delete, rename or archive original FORGE as part of M0/M1.
- Do not merge legacy PR #30. Preserve its exact remote head SHA, branch and all historic refs. Do not use the older RFC SHA literals as current evidence; query git and GitHub before acting.
- Do not commit real local SQLite databases, secrets, .env, keys, user files, attachments, production logs, or legacy backup archives to a public repository.
- Public repo is created only after generating lockfiles, auditing tracked files, passing checks and confirming GitHub CLI authentication. If GitHub CLI cannot create it, STOP and report exact blocker rather than pretending success.
- Do not pull over the entire legacy repo. M0 preservation is distinct from M1 clean scaffold. Never describe M1 as feature-parity-complete.

## M0 · Preserve original FORGE

1. Check the operator-supplied legacy checkout exists and `git remote -v` points to the expected original. Inspect `origin/main`, current open PR #30 branch and its exact SHA. Check uncommitted local changes; preserve worktree changes separately if any before declaring a full backup.
2. Run `tooling/scripts/preserve-legacy.ps1` from the new scaffold, with the absolute legacy folder path, writing the verified `git bundle --all`, SHA256 and JSON manifest **outside Git worktrees**. Check `git bundle verify` and confirm the PR #30 branch is represented in refs. Record the latest state and CI limitations of legacy source.
3. Inventory HTTP OpenAPI, existing Alembic revisions, Python/React/Rust lockfiles and packages, Figma IDs, currently shipped runtime assumptions, and known data migration constraints. No writing to real data stores.
4. If local legacy data must be migrated, make a separate local-only encrypted/offline backup plan and restore test; do not import legacy data into M1 or publish any of it.

## M1 · Clean public bootstrap

1. Extract the provided scaffold to the operator-approved independent directory. Confirm current file tree matches docs and no copied legacy secrets, binaries or old git history.
2. Confirm and install Node 24/npm 11, Python 3.12/uv and toolchains. Generate `package-lock.json` using `npm install`, `apps/api/uv.lock` using `uv lock --project apps/api`. Keep `Cargo.lock` deferred until Tauri implementation; do not pretend Desktop is available.
3. Run `npm run generate:tokens`, `npm run check:tokens`, `npm run check:architecture`, `npm run test:architecture`, `npm run typecheck`, `npm run build`. Fix any actual TypeScript workspace/Vite issues without weakening the boundaries.
4. Run API via `uv run --project apps/api uvicorn forge_org.main:app --app-dir apps/api/src --host 127.0.0.1`. Run pytest, Ruff, strict mypy, and `python tooling/scripts/export-openapi.py --check` under the uv project environment. Health must explicitly say `bootstrap-only`. Domain CRUD routes must not yet be fabricated.
5. Open the browser and validate `/` is an honest Organization empty state, and the dev-only `/__component-gallery` renders **real components** from `packages/ui`, demonstrates native interactions, and visibly switches Dark/Light. Confirm gallery is absent in production build and no component calls live APIs. Add focused Vitest/RTL tests and a Chromium smoke if necessary to meet M1 quality gate.
6. Enforce the new client architecture: `packages/tokens` is the foundation; `packages/ui` has only generic accessible primitives/compositions; `apps/web/src/app` owns shell and routing; `apps/web/src/features/<domain>/components` owns business patterns and status mapping; `packages/api-client` owns transport only. There must be **no** `apps/web/src/shared/ui` duplicates and no deep imports from packages. Strengthen dependency checks and add tests if gaps appear. A shared UI component must not depend on app/features/API.
7. Keep the 23 Figma/old CSS token differences as documented unresolved items. Do not silently alter Figma's global variables or claim pixel parity. Define the precise review plan; the initial token catalog is marked provisional.
8. Validate CI workflows, generate any missing config/locks, audit public files for secrets using actual tools, initialize clean git history (`git init -b main`) and commit. Then run `tooling/scripts/publish-public.ps1` or equivalent `gh repo create JoseAngelValadezBarajas/forge-org-tool --public --source . --remote origin --push` after a human review of staged files.
9. Verify GitHub repository URL and public visibility, main commit and CI status. Clone it into a clean temporary directory to prove repeatable bootstrap. Record observed results, not assumed results.

## Archive is a later separate gate

After M0 backup, new public repo verification and data/rollback decisions, request an explicit archival go/no-go. Do not run `gh repo archive` in M1, even if commands are prepared. Draft PR #30 will become read-only when the old repo is archived.

## Deliverables

- Public repo URL (only if actually created), exact SHA(s), clean worktree, M0 backup manifest path and SHA256 (never upload archive or private data), tested commands and counts.
- Updated RFC / ADRs for actual deviations, generated lockfiles, OpenAPI contract and CI evidence.
- Honest verdict `M1_READY_FOR_REVIEW` or `M1_BLOCKED`, with only concrete blockers and no unrelated refactor/audit cycles.
