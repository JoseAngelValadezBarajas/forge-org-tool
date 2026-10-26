# BYOC 0.2 Supabase parity implementation plan

Branch: `feature/forge-byoc-supabase-parity` from `origin/main`.

## Scope

Close the missing Supabase capability surface while preserving the local
FastAPI/SQLite adapter, public `organizationApi`, existing UI behavior, and
owner-controlled security boundaries. Do not edit the already-applied 0001
migration or touch real project data.

## Tasks

1. Establish the parity matrix and characterization tests for each public
   planning, attachment, and transfer operation.
2. Add migration 0002+ for tasks, acceptance criteria, dependencies,
   attachment metadata/private bucket, composite project ownership, RLS,
   grants, preflight versioning, and atomic RPCs.
3. Extend the Supabase api-client adapter for all planning CRUD, status,
   archive/restore, reorder, dependency, and attachment operations while
   preserving local routes and `getBlob`.
4. Implement remote JSON/contextual/ZIP transfer through versioned RPCs and
   authenticated storage operations with stale-fingerprint and compensation
   guarantees.
5. Add deterministic adapter, SQL contract, and local regression tests; add
   the disposable Supabase test path when its prerequisites are available.
6. Update provisioning, E2E A/B/C, parity, and operator documentation.
7. Run fresh package, frontend, API, architecture, build, and available
   browser/Desktop verification; record any exclusively real-project pending
   evidence without claiming it passed.

## TDD order

Each implementation task starts with a failing focused test or contract
assertion, then the smallest green implementation, then refactoring and
integration verification. Existing SQLite tests remain the regression oracle.
