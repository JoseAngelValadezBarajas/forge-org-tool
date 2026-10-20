# Original FORGE preservation baseline

Recorded during M0 on 2026-10-19 from the legacy checkout and live GitHub state.

## Repository and refs

- Origin: `https://github.com/JoseAngelValadezBarajas/Forge.git`
- Current remote `main`: `cadc4223d3c08c793b4f39152108997b697a7a75`
- PR #30: `MERGED`, title `UI-RFX-01 Â· Design System & Visual Architecture`
- PR #30 head branch: `feature/ui-rfx-01-design-system`
- PR #30 head SHA: `616533bdf82cec376e0ecfb9e956a6a8b8dfe005`
- PR #30 base SHA reported by GitHub: `33f05be51f3215f0550258cc5b5fd6b497f3cd4c`
- Legacy worktree status before preservation: clean (`git status --porcelain=v1` returned no lines).

The RFC's older SHA literals are historical references only and are not used as current evidence.

## Recovery artifacts

The verified preservation artifacts are stored outside Git worktrees:

- Script bundle: `Forge-legacy-20261019-230133.bundle`; manifest: matching `-manifest.json`.
- Supplemental complete bundle: `Forge-legacy-20261019-230133-complete.bundle`.
- Supplemental manifest: matching `-complete-manifest.json`.
- Supplemental bundle SHA256: `1901eafbef1538507163b412cb3893c4772131c4b24bab2b0bd138394a933e56`.
- Both bundles passed `git bundle verify`.

The preservation script's `git fetch --prune` removed a stale local remote-tracking ref that existed before the run. The ref was restored from its recorded SHA `2b9917d58ce342f89388b1d5457a0898c234dab2`, and the supplemental bundle was created afterward so the pre-run local ref is represented. The script should be changed in a later maintenance task to avoid pruning during preservation; that change is outside M1 product scope.

## Inventory and limitations

The legacy repository contains the prior FastAPI/React/Tauri implementation, OpenAPI and migration materials, multiple frontend/backend/desktop branches, and Figma references. Its CI history includes backend/frontend quality, CodeQL, Chromium smoke, and Windows desktop checks, but those results describe the legacy repository and are not M1 evidence.

M0 does not copy legacy source history or local databases into the new repository. Real-data migration is deferred to a separate local-only design with backup, dry-run, rollback, and integrity checks.

## Recovery procedure

1. Keep the external bundle and both manifests together.
2. Verify the bundle with `git bundle verify <bundle>`.
3. Clone or fetch the bundle into a separate recovery checkout.
4. Confirm the listed main and PR #30 branch SHAs before any operator action.
5. Never use the recovery checkout as the new public product workspace.
