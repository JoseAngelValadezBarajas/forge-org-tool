# FORGE Org Tool 1.0 Architecture

Status: implementation target for the local-first 1.0 MVP. `docs/product/mvp-1.0.md` is the product contract; this document records the runtime and dependency boundaries.

## Runtime and ownership

- **Web:** React + Vite + TypeScript. The app composes feature-owned workflows; feature modules own business UI and domain mapping.
- **Shared UI:** `@corefoundry-labs/forge-ui` owns generic controls and surfaces; `@corefoundry-labs/forge-tokens` owns semantic design tokens. Shared UI must not import app, feature, API, or backend code.
- **API client:** `@forge-org/api-client` owns generated OpenAPI types, transport, and typed capability operations. The compatibility `organizationApi` facade remains available during the public API transition.
- **Backend:** FastAPI exposes Pydantic/OpenAPI adapters; application services coordinate domain actions and transaction boundaries; infrastructure owns SQLite connections, migrations, and persistence. Domain rules remain independent of the web framework.
- **Desktop:** Tauri 2 hosts the same React app and a bounded Python sidecar. IPC does not expose arbitrary filesystem access, shell/process control, credentials, ports, or unrestricted URLs.
- **Durable data:** SQLite is authoritative for workspaces, projects, epics, stories/features, bugs, criteria, tasks, tags, dependencies and transfer state. Browser storage is limited to presentation preferences.

## Dependency direction

`web app → feature → @corefoundry-labs/forge-ui + @forge-org/api-client`; `@corefoundry-labs/forge-ui → @corefoundry-labs/forge-tokens`; backend `API → application → domain`, with infrastructure implementing persistence. Cross-feature imports use documented public feature barrels. No feature-specific product composition is moved into a generic package.

## Capability scope

Active product scope is Organization, Planning, Project Transfer and shared UI. Decisions, Invariants, Readiness, repository connections/observation, Context Packages, Runs, Handoffs, Delivery and release/verification governance are retired from active navigation and API. Upgraded databases retain their legacy tables and records, but these capabilities are not exposed by the 1.0 API. New databases contain only current product tables and migration metadata.

## API and compatibility

`contracts/openapi/forge-org-v1.json` is the checked-in HTTP contract generated from FastAPI. Changes require backend contract tests and generated client type verification. Legacy import/export remains supported while v2 uses the shared validated engine and fingerprint-guarded preview/confirm flow.

## Migration and backup

Database upgrades are forward-only and replay-safe. Before any migration mutates a pre-existing database, make a SQLite online backup and verify its integrity. Reject unknown future schema versions before creating or changing tables. Never drop legacy tables or alter operator data as part of this product simplification.

## Development Component Host

The `/__components` route is development-only, absent from production output, and previews only shared UI and in-scope product compositions. Automated interaction/contract evidence is not human Figma visual certification.
