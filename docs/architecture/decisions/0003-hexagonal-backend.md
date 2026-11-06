# ADR-0003: Hexagonal backend (ports and adapters)

**Decision: accepted, 2026-11-06.** The FastAPI backend follows one architecture: hexagonal (ports and adapters), expressed with the layer names the repository already uses. DDD tactical patterns beyond pure rule modules, CQRS and event sourcing are out of scope for the size of the product.

## Layers and dependency direction

| Layer            | Owns                                                                           | May depend on                                         |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `domain`         | Pure rules: validation, schema/limits, errors, clock                           | standard library only                                 |
| `application`    | Use cases; the ports they need (`application/ports.py`)                        | `domain`, ports                                       |
| `infrastructure` | Adapters: SQLite repositories, migrations, connection                          | `domain`, `application.ports`                         |
| `api`            | HTTP adapter (Pydantic/OpenAPI) and the composition root `api/dependencies.py` | everything, but only `dependencies.py` binds adapters |

Rules, enforced by `apps/api/tests/test_layer_dependencies.py` (no allowlist):

1. `domain` and `application` import no `sqlite3`, `fastapi`, `pydantic`, `sqlalchemy` or `forge_org.infrastructure`.
2. `api` route modules import no `sqlite3` or `forge_org.infrastructure`; `dependencies.py` is the only composition root.
3. `infrastructure` does not import `api`.
4. Adapters translate driver errors into domain errors (`DuplicateRecord`); callers never see `sqlite3.IntegrityError`.
5. Domain and application raise typed errors (`NotFound`, `InvalidInput`, `Conflict`, `DuplicateName`) that subclass the matching built-ins. `api/error_handlers.py` is the only place that maps them to HTTP statuses; route modules do not repeat `try/except` mappings.

## Two storage providers

Local SQLite is the Python adapter described above. The Supabase (BYOC) provider is a client-side adapter implemented in SQL and TypeScript, so it cannot literally implement the Python ports. The product rules it shares with the domain (limits, screenshot validation) are pinned by `contracts/transfer/conformance.json` and tested in both languages (see `transfer-conformance.md`). New shared rules start in the domain module and the conformance file.

## Where rules go

- A rule that does not need a repository is a function in `domain` (`planning.py`, `organization.py`, `transfer_document.py`) with a unit test that runs without a database.
- A rule that needs existing data is a use case in `application`, calling a port.
- A SQL statement belongs in `infrastructure`.

## Consequences

- Moving a rule into the domain is a behaviour-preserving change guarded by the API characterization tests and the checked-in OpenAPI contract.
- Adding a persistence backend means implementing the ports, not editing services.
- The TypeScript Supabase adapter keeps its stateful closure in `supabase.ts`; its pure rules live in `attachment-validation.ts`, `project-package.ts`, `supabase-storage-paths.ts` and `supabase-shared.ts`.
- Remaining debt: Supabase rules are still duplicated across SQL and TypeScript, and the large planning pages in the web app do not yet follow the hook-and-view split used by the application shell.
