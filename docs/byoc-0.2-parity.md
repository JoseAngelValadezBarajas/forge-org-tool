# BYOC 0.2 parity register

| Capability                       | SQLite contract                               | Supabase implementation                                                                            | Automated evidence                                        | Real-project evidence           |
| -------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| Workspace/project/epic/work item | CRUD, status and archive lifecycle            | Data API + RLS + composite ownership                                                               | `packages/api-client/test/supabase.test.mjs`              | Owner A/B/C run pending         |
| Tasks                            | list/create/update/status/reorder             | `tasks` + `forge_reorder_tasks`                                                                    | Supabase adapter contract                                 | Owner A/B refresh pending       |
| Acceptance criteria              | list/create/update/satisfy/delete/reorder     | `acceptance_criteria` + `forge_reorder_criteria`                                                   | Supabase adapter contract                                 | Owner A/B refresh pending       |
| Dependencies                     | CRUD, same project, no self/cycle             | `feature_dependencies` + `forge_create_dependency`                                                 | RPC request contract; SQL contract                        | RLS/cycle run pending           |
| Attachments                      | metadata, bounded image bytes, content/delete | private Storage bucket + read-back signature/size/SHA-256 verification + metadata/RLS/compensation | upload/content/no-public-URL and mismatch rejection tests | Owner project run pending       |
| Project JSON v1/v2               | preview/fingerprint/atomic import/export      | versioned transfer RPCs                                                                            | RPC routing contract                                      | Owner round-trip pending        |
| Contextual JSON v2               | Epic, Work Item and Task scopes               | contextual transfer RPCs with scope/project/destination-bound fingerprints                         | route/RPC and migration contract                          | Owner round-trip pending        |
| Project ZIP v2                   | manifest, checksums, bounded screenshots      | streamed bounded extraction + staged Storage read-back verification                                | ZIP adapter and decompression-budget tests                | Owner round-trip pending        |
| Membership/security              | owner/editor/viewer, workspace isolation      | DB RLS and owner-controlled membership RPC                                                         | SQL/RLS/static contract                                   | User C and owner action pending |

“Automated evidence” means executed local tests only. “Real-project evidence”
is intentionally pending until the owner runs the disposable Supabase A/B/C
procedure without FORGE receiving credentials.
