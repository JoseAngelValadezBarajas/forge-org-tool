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
