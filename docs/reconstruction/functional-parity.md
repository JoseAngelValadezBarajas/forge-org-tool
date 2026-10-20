# Functional parity inventory

Status vocabulary: `NOT_STARTED` means the new repository has no accepted
implementation for the capability; `SPECIFIED` means its target contract is
written and testable; `VERIFIED` requires passing implementation tests and
named browser or API evidence. “Observed” below describes evidence found in
the original repository and is not a claim about the new repository.

## Source baseline

The local legacy checkout was inspected at `origin/main` commit
`cadc4223d3c08c793b4f39152108997b697a7a75`. Capability branches are retained
as lineage evidence: FND-01 through FND-06, IMP-01, and DESK-01. The source
contains backend routers and application services, seven migrations,
frontend feature modules, tests, Playwright flows, and product acceptance
documents. The original root license is PolyForm Noncommercial 1.0.0; its
code and assets are therefore not copied into this Apache-2.0 reconstruction.

## Capability matrix

| ID | Original capability observed | Evidence locations in legacy refs | New status | Target boundary |
| --- | --- | --- | --- | --- |
| ORG-001 | Workspaces contain projects; project CRUD and selection | `backend/app/api/routers/workspaces.py`, `projects.py`; `backend/tests/test_workspace_projects.py`; `feature/fnd01-workspace-project-management` | `VERIFIED` | `apps/api/src/forge_org/{domain,application,infrastructure,api}` and `apps/web/src/features/organization` |
| ORG-002 | Epics, features, tasks, acceptance criteria, dependencies, board states | `backend/app/api/routers/planning.py`; `frontend/src/features/planning`; `backend/tests/test_planning.py`; FND-02 branch | `VERIFIED` | `apps/api/src/forge_org/application/planning.py`, planning routes, `apps/web/src/features/planning` |
| ORG-003 | Decisions, invariants, revision-aware acknowledgements, readiness snapshots | routers `decisions.py`, `invariants.py`, `readiness.py`; `backend/tests/test_fnd03.py`; FND-03 branch | `VERIFIED` | `apps/api/src/forge_org/application/{knowledge,readiness}.py`, readiness feature |
| ORG-004 | Read-only local Git observations and immutable `forge-context-v1` packages | `backend/app/application/git_context.py`, `context_packages.py`; `frontend/src/features/repositories`; FND-04 docs/tests | `VERIFIED` | `apps/api/src/forge_org/application/{repositories,context_packages}.py`; repository/context UI with metadata-only observer, feature links, package preview/save/download |
| ORG-005 | Human-reported runs, append-only events, immutable handoffs and acknowledgements | `backend/app/application/runs`, `handoffs`; `frontend/src/features/workbench`; `docs/fnd05-runs-handoffs.md`; FND-05 branch | `VERIFIED` | `apps/api/src/forge_org/application/runs.py`; reported work UI with draft/ready/acknowledged handoffs and immutable revision downloads |
| ORG-006 | Evidence provenance, verification, release candidates, explainable gates, non-published manifests | `backend/app/application/delivery`; routers `evidence.py`, `verifications.py`, `releases.py`; FND-06 docs/tests | `IMPLEMENTED_NOT_REVIEWED` | `apps/api/src/forge_org/application/delivery.py`; explicit gate truth states |
| ORG-007 | JSON project import/export with schema and route/contract tests | `docs/product/imp-01-project-import-export.md`; schema/examples; `backend/app/application/project_transfer.py`; IMP-01 branch | `IMPLEMENTED_NOT_REVIEWED` | `apps/api/src/forge_org/application/transfer.py`; versioned transfer contract and `/transfer/:workspaceId/:projectId` UI |
| ORG-008 | Windows desktop packaging and authenticated local sidecar bridge | `desktop/src-tauri`; `backend/desktop_sidecar.py`; DESK-01 docs/workflows | `SPECIFIED` | `apps/desktop`; Rust-owned process and route policy; packaging outstanding |
| ORG-009 | Core shell, navigation, planning, readiness and delivery visual language | `frontend/src/features`; `docs/product/ui-rfx-01.md`; Figma pages 19/20 | `IMPLEMENTED_NOT_REVIEWED` | `apps/web/src/features/{organization,planning,readiness,repositories,workbench,delivery}`, `packages/ui`, `packages/tokens` |

## What is validated versus assumed

Validated for the legacy source: the files, refs, migrations, tests, and
acceptance documents named above exist in the local checkout. Validated for
the new repository: M0 preservation, M1 foundation, and the ORG-001
API/frontend slice documented in `docs/evidence/m1/verification.md`.

Assumptions requiring a slice-level contract before implementation include
which legacy edge cases are user-critical, whether the desktop packaging is
in the first public target, and which stored records are migration inputs.
No assumption may be promoted to product behavior without a spec, a failing
test, an implementation, and the relevant verification evidence.
