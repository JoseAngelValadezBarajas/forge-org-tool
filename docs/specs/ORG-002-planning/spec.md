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

## Epic detail parity requirement

`REQ-ORG-002-EPIC-DETAIL` — A user can open a specific Epic from its planning
summary, inspect its description and status, edit its title/description/status
when the owning Project is active, and open the Features associated with that
Epic. The detail route must resolve both the Project and Epic from the current
workspace-scoped API response; an unknown or cross-Project Epic must not be
shown as a valid detail. Archived Projects remain read-only. Editing changes
the existing Epic record and must not imply implementation or delivery
verification.

Acceptance is verified by the Epic detail feature tests and the user-driven
planning acceptance journey recorded in the reconstruction evidence.
