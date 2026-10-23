# ORG-002 acceptance

- [x] Create project-scoped epics and features.
- [x] Reject missing project or cross-project epic references.
- [x] Preserve manual feature status and priority values.
- [x] Return an overview grouped by epic and unassigned features.
- [x] Render a board route with explicit manual status columns.
- [x] Keep manual planning state distinct from delivery evidence.
- [x] Tasks, acceptance criteria, and project-scoped dependencies.
- [x] Filtering, epic/feature/task edits, task reorder, and dependency removal API contracts.
- [x] `REQ-ORG-002-EPIC-DETAIL`: preserve Epic statuses `planning | archived`
      and existing target statuses `planned | in_progress | done` in the
      OpenAPI and persisted API contract; open, inspect, edit and navigate a
      specific Epic through its workspace-scoped detail route; an archived
      Project is read-only and a missing/cross-Project Epic is rejected
      visibly (`PA-PLAN-003`). API status contract tests cover all five
      preserved values and reject unsupported `paused`.
- [x] Chromium review of the planning route and responsive evidence.
