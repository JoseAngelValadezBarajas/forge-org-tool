# ORG-002 Planning foundation

The planning slice owns project-scoped epics and features. Planning status is
manual product state only; it is never delivery, CI, deployment, or evidence
verification. Features may be associated with an epic, and the overview groups
features by epic plus an explicit unassigned list.

The board route is `/planning/:workspaceId/:projectId`. API routes are nested
under the owning workspace and project. The implementation supports epics,
features, tasks, criteria, dependencies, filtering, manual updates, and task
reordering; all remain planning records and never claim execution, verification,
or delivery.
