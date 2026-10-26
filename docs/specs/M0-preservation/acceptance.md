# M0 acceptance

| ID     | Acceptance evidence                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| M0-001 | `git remote -v`, `git ls-remote`, and `gh pr view 30` output retained in the milestone report.                                 |
| M0-002 | Legacy `git status --porcelain=v1` recorded before bundle creation.                                                            |
| M0-003 | Preservation script output plus successful `git bundle verify` and SHA256 manifest.                                            |
| M0-004 | Migration-boundaries document states no real data was copied or imported.                                                      |
| M0-005 | Preservation evidence records observed refs, recovery instructions, and limitations in the Git/CI history for this initiative. |

Observed M0 result: the preservation script completed under a process-scoped execution-policy bypass. Because its `fetch --prune` removed one stale local remote-tracking ref, a supplemental complete bundle and manifest were created after restoring that ref. The original worktree remained clean and unarchived.
