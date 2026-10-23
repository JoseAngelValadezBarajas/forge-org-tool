# FORGE Org Tool 1.0 Data Model

SQLite is the system of record. All domain records are workspace/project scoped through explicit foreign keys or a documented parent relationship. Identifiers and normalized tags are stable across reloads and transfer. UI state such as theme and panel preferences may be local; product state may not.

## Active aggregates

| Aggregate              | Ownership and relationships                                       | Durable behavior                                                                                  |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Workspace              | Root local scope; unique normalized name                          | Create, edit, list, select active workspace, archive/restore if supported by the product API      |
| Project                | Belongs to one workspace; has active/archived lifecycle           | CRUD and archive/restore; archived projects reject ordinary mutation                              |
| Epic                   | Belongs to a project                                              | First-class project-board item with priority, tags and derived progress                           |
| Story / legacy Feature | Belongs to a project and optionally an Epic                       | Stories and Bugs are first-class persisted work items; legacy Features remain readable/migratable |
| Bug                    | Planning work item with structured report fields                  | Optional local image attachments use bounded, validated, staged storage                           |
| Acceptance Criterion   | Belongs to a Story/Feature                                        | CRUD, ordered position, safe plain-text notes and persisted satisfaction state                    |
| Task                   | Belongs to a Story/Feature                                        | Persisted planning task, status and order                                                         |
| Dependency             | Links blocking and blocked planning items within the same project | Unique directed edge; cycle/reference checks enforced by application validation                   |
| Workspace tag          | Stable normalized key in a workspace scope                        | Reuse within that workspace; identical labels in other workspaces are independent                 |
| Transfer preview       | Scoped to a target workspace/project and payload fingerprint      | Preview and confirm share validation; stale fingerprints fail without partial writes              |

## Work status

The 1.0 workflow has five persisted columns: `BACKLOG`, `READY`, `IN PROGRESS`, `VERIFY`, `DONE`. Archive lifecycle remains separate. Existing state values are preserved and mapped deliberately; unknown legacy values are not silently coerced into verified or completed states.

## Retained legacy storage

Upgraded databases may contain Decisions, Invariants, Readiness evaluations, repository observations, Context Packages, Runs, Handoffs, Evidence, Verification evaluations, Release Candidates, Gate evaluations and Release Manifests. These tables and records are retained as inactive compatibility data; 1.0 routes and UI do not expose them. Fresh 1.0 databases do not create these tables. Forward migrations never delete them.

## Data safety invariants

- Foreign keys are enabled for every connection; project/workspace boundaries are validated before writes.
- Multi-record import and reorder operations are atomic.
- A pre-migration SQLite online backup is completed and integrity-checked before mutation.
- Migration version checks reject future versions before altering any schema.
- Tests use isolated temporary paths and synthetic data; they never read or mutate operator databases.
- Image attachments accept PNG/JPEG/WebP only and enforce archive safety, count, compressed/expanded size and checksum constraints before staged commit.

See [migration plan](../migration/plan.md), [product contract](../product/mvp-1.0.md), and [Project Transfer contract](../import-export/README.md).
