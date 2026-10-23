# ORG-001 acceptance

- [x] Create and list workspaces through the API.
- [x] Reject case-insensitive duplicate workspace and project names.
- [x] Create, search, archive, and restore projects within a workspace.
- [x] Prevent cross-workspace project access.
- [x] Persist records across API client sessions.
- [x] Render actionable empty, loading, error, active, and archived states.
- [ ] `REQ-ORG-001-PROJECT-OVERVIEW`: open a persisted Project overview from
      Organization; show its Workspace/Project metadata, live planning counts,
      Decision/active Invariant counts and up to four priority-ordered pending
      Features; edit name/description; confirm archive and restore; navigate to the
      existing Planning board and Transfer export workflow; verify persistence
      and visible recovery for an unavailable Project (`PA-ORG-002`).
- [x] Keep `/__components` deterministic and backend-free.
- [ ] Human Figma review of the organization screen; automated tests are not
      visual certification.
