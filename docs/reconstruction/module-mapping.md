# Legacy-to-new module mapping

This mapping is a planning boundary, not a promise that legacy code is
portable. The legacy implementation is evidence only because its root
license is PolyForm Noncommercial 1.0.0. New code must be authored in this
repository or separately cleared before reuse.

| Legacy area | New destination | Ownership and rule |
| --- | --- | --- |
| `backend/app/domain` and persistence models | `apps/api/src/forge_org/domain` plus infrastructure adapters | Domain has no FastAPI, SQLAlchemy, filesystem or process concerns. |
| `backend/app/application/workspaces.py`, `projects.py` | `apps/api/src/forge_org/application/workspaces.py`, `projects.py` | Application owns transactions and durable state changes. |
| `backend/app/api/routers` and schemas | `apps/api/src/forge_org/api` | API translates HTTP/OpenAPI; it does not contain business rules. |
| `backend/app/application/planning.py` and frontend planning feature | `apps/web/src/features/planning` plus API application planning service | Feature owns business UI; shared components come from `packages/ui`. |
| decisions, invariants, readiness | `features/decisions`, `features/invariants`, `features/readiness` | Revision and acknowledgement semantics remain explicit and backend-owned. |
| repositories and context packages | `features/repositories`; API infrastructure Git observer | Read-only observation, bounded paths, immutable fingerprinted packages. |
| runs and handoffs | `features/workbench`; application run/handoff modules | Human-reported evidence must remain distinct from execution or CI claims. |
| delivery/evidence/release modules | `features/delivery`; delivery application package | Evidence provenance and gate results are immutable, explainable states. |
| import/export transfer | `features/projects`; versioned contract package | Schema validation and route adapters are separate from project domain logic. |
| `desktop/src-tauri` and sidecar | later `apps/desktop` | Rust owns process, route, filesystem and capability policy; React receives only allowlisted data. |
| legacy shared components and CSS | `packages/ui`, `packages/tokens` | Re-author tokens/components; no feature-local Button/Input/Card/Badge/StatusChip duplicates. |

## Dependency direction

`app` composes features. Features may use public package APIs and the API
client, but feature-to-feature imports require an explicit `index.ts` public
API. `packages/ui` imports neither app, features, backend nor API. Backend
dependencies flow `api -> application -> domain`, with infrastructure
implementing ports. Durable state stays in the backend; browser storage is
limited to local presentation preferences.
