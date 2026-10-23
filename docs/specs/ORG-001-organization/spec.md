# ORG-001 Organization foundation

## Contract

The API owns durable workspaces and projects in a local SQLite database. Names
are required and unique case-insensitively within their owning collection.
Projects belong to one workspace and support active/archived status, search,
creation, and restore. The web application consumes these routes through the
public API-client package and renders explicit loading, empty, error, and data
states.

## Boundary

- API: `/api/v1/workspaces` and workspace-scoped `/projects` routes.
- Persistence: `FORGE_DATABASE_PATH` or `.forge/forge.db`.
- Frontend: `/` organization route; development Component Host remains
  `/__components` and backend-free.

## Truth constraints

No project records are fabricated in the UI. Empty, archived, and error states
are represented explicitly. This slice does not import legacy code or assets.

## Project overview parity requirement

`REQ-ORG-001-PROJECT-OVERVIEW` — A user who selects a Project from Organization
can open a project overview before entering the planning board. The overview
loads the Project and owning Workspace through the public API client, presents
persisted name, description, status and timestamps, and shows live planning
counts (Features, Tasks, Epics, satisfied/total acceptance criteria,
Dependencies),
active Decisions, active Invariants, and a bounded priority-ordered list of
pending Features. Counts must be derived from the owning Project's API records;
the UI must not invent delivery or verification state. A user can update the
Project name and description, archive an active Project after explicit
confirmation, and restore an archived Project. Cancelling the confirmation
performs no write. These operations remain workspace-scoped and persisted by
the API. The overview provides navigation to the planning board and the
existing Project transfer/export workflow. Loading and API failure states are
visible and retryable; an unavailable Project is not presented as a successful
empty Project. The planning board remains directly reachable and retains its
existing URL and behavior.

Acceptance: `docs/specs/ORG-001-organization/acceptance.md` and the
`PA-ORG-002` browser journey. API response/request types must be sourced from
the generated OpenAPI declarations.
