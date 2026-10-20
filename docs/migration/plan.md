# FORGE (legacy) -> FORGE Org Tool

## M0 · Preserve before archive

- Record main SHA, UI-RFX-01 PR #30 branch/ref and SHA, release tags, OpenAPI, migration revisions, and CI results.
- Produce `git bundle --all` from an up-to-date local FORGE clone, run `git bundle verify`, and store archive + SHA-256 outside *both* public worktrees. Keep the original GitHub repo and PR browseable.
- Back up `%LOCALAPPDATA%\\Forge` databases, attachments and migration artifacts locally only if migration of user data is desired; **never** commit, attach or upload those to a public repo. Test backup restore on a copy.
- Preserve contracts and test fixtures as *references*. Copy code selectively with attribution and a compatibility test, not an unreviewed full tree transplant.
- Make an explicit migration compatibility matrix for Workspaces, Projects, Planning, Knowledge, Readiness, Git, Collaboration and Delivery.

## M1 · Public bootstrap

- Generate npm and uv lockfiles; run security review and checks. Initialize an independent Git history, create `JoseAngelValadezBarajas/forge-org-tool` **public**, push `main`.
- Keep source-client component architecture and the development-only UI gallery from the first commit.
- Confirm clone from a clean folder and no private data. Publish versioned architecture decisions.

## M2–M7 · Vertical slices

- M2 Organization, M3 Planning and import/export, M4 Knowledge/Readiness, M5 Git/Collaboration, M6 Delivery, M7 Windows installed product and supported data migration.
- Each phase has real use-case tests, contracts and domain invariants; do not claim legacy parity until evidenced.

## Final archive gate

- New public repo accessible; M0 git bundle verified with hash and recovery owner; legacy PR #30 captured; local data backups (if applicable) verified; new migration roadmap and rollback documented; operator reviews open PRs/issues; explicit archive approval.
- Only then run `gh repo archive JoseAngelValadezBarajas/Forge --yes` as a separate operator action. Do **not** delete, force-push, rewrite, or rename the legacy repository.
