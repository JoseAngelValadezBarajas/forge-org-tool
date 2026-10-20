# M0 Preservation Specification

## Purpose

Preserve the original FORGE repository as an independent recovery source before the new product is published. M0 does not archive, rename, force-push, delete, merge, or migrate real data from the original repository.

## Scope

M0 covers current remote/ref verification, worktree status, complete Git bundle creation and verification, SHA256 manifest generation outside Git worktrees, and a read-only inventory of contracts, migrations, lockfiles, runtime assumptions, Figma references, and local-data boundaries.

## Requirements

### M0-001 â€” Remote and refs are current

Given the legacy checkout is available, when M0 begins, then its origin must match the expected public repository, current `origin/main` must be queried, and the PR #30 head branch and SHA must be queried from GitHub and Git refs.

### M0-002 â€” Worktree changes are visible

Given the legacy checkout may contain local work, when preservation runs, then uncommitted status is recorded and the operator is not told that a complete backup is clean unless the status evidence supports that claim.

### M0-003 â€” Complete Git recovery artifact

Given current refs are available, when the preservation script runs, then `git bundle --all` is written outside worktrees, `git bundle verify` succeeds, SHA256 is recorded, and the manifest records the current main SHA, PR #30 branch SHA, bundle path, verification state, and data-backup exclusion.

### M0-004 â€” No real data migration

Given local databases, attachments, logs, or user files may exist, when M0 inventories them, then it records migration as deferred and does not copy, import, or publish those files.

### M0-005 â€” Recovery and limitation record

Given the legacy source has historical CI/runtime assumptions, when the inventory is written, then recovery instructions and observed CI limitations are documented without claiming feature parity or current production status.

## Non-goals

Archiving the legacy repository, merging PR #30, changing GitHub refs, migrating real data, or implementing new product features.
