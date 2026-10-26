# FORGE BYOC 0.1 Live Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the live-readiness gaps in Supabase authentication, session restoration, cross-project feature/epic integrity, and owner-operated E2E documentation.

**Architecture:** Keep the browser `@forge-org/api-client` as the only cloud boundary. Supabase Auth receives the grant in the query string and credentials in the body; the persisted session is bound to its normalized profile. FastAPI remains the local SQLite sidecar. PostgreSQL constraints and RLS remain the enforcement boundary for remote invariants.

**Tech Stack:** TypeScript, Node test runner, PostgreSQL/Supabase SQL, Python/pytest, Markdown.

**Spec:** User request: FORGE BYOC 0.1 Live Readiness.

## Global Constraints

- Do not merge, touch `main`, access real user/production data, or execute owner migrations against a live project.
- Preserve `organizationApi`, local SQLite behavior, explicit provider switching, and no silent cloud-to-local fallback.
- Report live Supabase validation as pending unless an owner supplies a disposable project and retained evidence.

## Review Focus

- Auth grant placement: query string contains only the grant and the JSON body contains only credentials.
- Reload session ownership: a session survives reload only when its normalized profile matches; changing provider/project invalidates it.
- Cross-project relation: a feature cannot point at an epic belonging to another project.
- E2E identity boundary: installations A/B share one authorized identity; user C has no membership; owner membership provisioning is explicit and controlled.
- Layer boundary: cloud traffic is React → api-client → Supabase; FastAPI remains local SQLite-only.

### Task 1: Supabase Auth request and reload restoration

**Files:**
- Modify: `packages/api-client/src/storage.ts`
- Test: `packages/api-client/test/supabase.test.mjs`
- Test: `packages/api-client/test/storage.test.mjs`

- [ ] Add failing exact-URL/body tests for password and refresh grants.
- [ ] Add failing reload and profile-change session tests using persisted profile-bound session state.
- [ ] Implement query-string grant placement and profile-bound session restoration/invalidation.
- [ ] Run focused package tests and the full package contract suite.

### Task 2: Cross-project Supabase schema invariant

**Files:**
- Modify: `supabase/migrations/20261026_byoc_0001.sql`
- Test: `apps/api/tests/test_byoc_sql_contract.py`

- [ ] Add a failing contract test for a mismatched project/epic pair.
- [ ] Add a composite unique key on epics and composite foreign key from features.
- [ ] Run SQL contract tests and the full API suite.

### Task 3: E2E and architecture documentation

**Files:**
- Modify: `docs/operations/byoc-supabase.md`
- Modify: `docs/architecture/byoc-0.1.md`

- [ ] Document identical authorized identity for installations A/B, user C without membership, and owner-controlled membership provisioning separately.
- [ ] Document React → api-client → Supabase and FastAPI → SQLite, with critical invariants in DB/RLS.
- [ ] Run formatting/diff checks and review the final wording against implementation.

### Task 4: Whole-branch verification and delivery

- [ ] Run package, API, frontend, architecture, production build, and relevant Desktop checks.
- [ ] Push the branch, run GitHub Quality, and update PR #7 with the final SHA and only the remaining real-project validation boundary.
