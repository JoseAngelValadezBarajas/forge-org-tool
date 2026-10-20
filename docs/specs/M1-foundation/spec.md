# M1 Foundation Specification

## Purpose

Create an independent public foundation for FORGE Org Tool with reproducible frontend/backend tooling, a truthful browser shell, reusable UI boundaries, and verifiable quality gates. M1 is not feature parity and does not implement Organization/Planning CRUD.

## Requirements

### M1-API-001 â€” Bootstrap health

Given the API process starts under the documented uv project, when a client sends `GET /api/v1/health`, then it receives HTTP 200 and a documented response whose scope is exactly `bootstrap-only`.

### M1-API-002 â€” No fabricated domain routes

Given M1 has no Organization/Planning persistence, when the OpenAPI contract is exported, then only the health endpoint and documented bootstrap metadata are exposed; domain CRUD routes are absent.

### M1-UI-001 â€” Truthful organization empty state

Given the frontend is available, when the user opens `/`, then the application shell renders without runtime errors and shows an empty Organization state that does not claim persisted organizations or projects.

### M1-UI-002 â€” Reusable component contracts and behavior

Given the Component Host renders shared components, then Card defaults to a neutral `div` while allowing a narrow typed semantic root where justified, and Button preserves native attributes, ref forwarding, disabled/loading behavior, and accessible state exposure. Button hover and pressed treatments use semantic tokens without overriding focus-visible or disabled behavior.

### M1-UI-003 â€” Development-only Component Host and theme

Given a development build, when the user opens `/__components`, then real public exports from `packages/ui` and implemented feature components render from deterministic local fixtures, the catalog is searchable, native interactions work, and the user can switch Dark/Light visibly. Given a production build, the route and Component Host entry are absent.

### M1-ARCH-001 â€” Enforced dependency boundaries

Given the monorepo source tree, when architecture checks run, then shared UI cannot import app/features/API/backend, packages are consumed through public barrels, feature cross-imports use documented public APIs, and duplicate shared UI folders are absent.

### M1-TOOL-001 â€” Reproducible environments

Given supported Node/npm and Python/uv versions, when dependencies are installed from committed lockfiles, then frontend checks/build and backend checks run without relying on untracked machine state. Cargo.lock remains deferred because Tauri is not implemented in M1.

### M1-SEC-001 â€” Public-safe files

Given the repository is prepared for publication, when tracked files are audited, then no credentials, secrets, .env files, real databases, user files, private backups, production logs, or machine-specific private paths are tracked.

## Non-goals

CRUD, SQLite migrations, Tauri runtime, sidecar packaging, real-data migration, SaaS behavior, agent execution, delivery publication, or pixel-parity certification.
