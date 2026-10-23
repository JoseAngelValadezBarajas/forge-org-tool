# FORGE Org Tool 1.0 — Product Contract

## Product direction

FORGE Org Tool 1.0 is a local-first project organization app. SQLite is the system of record; Git hosting, agents, external providers, CI and delivery pipelines are not prerequisites. Preserve existing user data and compatible contracts, but do not continue exposing advanced product areas that are out of this MVP scope.

## Acceptance criteria

1. **Workspace and Project:** real create/read/update/archive/restore workflows, workspace/project isolation, and an explicit active workspace selector that survives reload.
2. **Project Board:** Epics are first-class project-scoped records with priority, tags, progress, and usable empty/loading/error states.
3. **Epic Board:** Stories and Bugs are persisted through API/SQLite; legacy Features remain readable and compatible. Creating a Story must never be a client-only simulation.
4. **Acceptance Criteria:** criteria support create, edit, delete and reorder; notes are safely rendered; normalized workspace tags have stable identity and never leak across workspaces.
5. **Bugs and attachments:** Bugs have structured fields. Local PNG/JPEG/WebP attachments are bounded in count and size, staged safely, validated against traversal/symlink attacks, and persist across restarts within the desktop request-size limit.
6. **Workflow status:** five persisted columns — BACKLOG, READY, IN PROGRESS, VERIFY, DONE — support drag-and-drop and an accessible status selector. Legacy statuses remain deliberate; archive is not a workflow status.
7. **Durability:** product data survives browser/API/Desktop restarts using SQLite. Tests never seed or mutate operator production data.
8. **Project Transfer:** support v2 JSON plus v1 compatibility through one validated engine; enforce schema, references, workspace scoping, tags and stale fingerprints atomically. ZIP attachments require checksums, safe paths, bounded sizes/counts and secure staged writes. Keep the required valid/invalid fixture set.
9. **Component Host:** retain `/__components` as development-only. Remove previews for retired capabilities and retain shared UI and product compositions still in scope.

## In scope / preserve

Keep Organization, Planning Tasks, Acceptance Criteria, Dependencies, Project Transfer, and genuinely reusable shared packages. Generic controls belong in `@forge-org/ui`; business compositions remain feature-owned. Keep React, Vite, TypeScript, FastAPI, SQLite, Tauri 2, npm workspaces and OpenAPI. Preserve ORG-001–007 behavior unless superseded by an explicit criterion above.

## Retire from active product

Remove active UI/API/application behavior for Decisions, Invariants, Readiness engine, repository connections/observation, Context Packages, Runs, Handoffs, Delivery, and verification/release governance. Existing advanced tables and rows in upgraded databases are preserved but inactive. Fresh databases must not create obsolete tables. Do not delete legacy user data as part of this simplification.

## Data safety and migration

Before altering an existing SQLite database, create and verify a consistent backup using SQLite's backup mechanism. Migrations are forward-only, replay-safe, and preserve schema compatibility for existing data; reject future schema versions without mutation. Tests must prove backup integrity, retry/replay safety, and legacy-table preservation. Do not point tests at user data.

## Transfer security

Preview and confirm use the same validation logic and fingerprint guard. Invalid schema, references, duplicate identifiers, stale previews, malformed archives, path traversal, symlinks, unsupported image types, oversized payloads, or cross-workspace references fail without partial writes. Export/import round trips v1 and v2 fixtures and attachments.

## Boundaries and delivery

Keep Tauri IPC narrowly scoped; do not expose arbitrary filesystem access, shell/process capability, ports, credentials, or unrestricted URLs. Keep accessibility and responsive behavior. Do not change global Figma variables, archive original FORGE, merge PR #1/#2, force-push, or modify live operator data. Distinguish automated behavior verification from human-reviewed Figma visual parity; unreviewed visuals are not certified.

## Required delivery evidence

Publish the product, architecture, data-model, acceptance, and import/export documentation. Verify typecheck, architecture boundaries, frontend/backend/API contracts, migrations, production build, Component Host route exclusion, isolated browser journeys and available desktop packaging/UI acceptance. Retain representative desktop/mobile screenshots. Report unavailable runner coverage as a limitation rather than a pass.
