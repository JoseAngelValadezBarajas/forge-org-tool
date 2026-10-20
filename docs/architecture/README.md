# Architecture · RFC-001

Status: **M1 scaffold**. This README describes the *target* architecture; the actual code implements only a React design-system preview and FastAPI health check.

## Bounded contexts

Organization owns Workspaces and Projects. Planning owns Epics, Features, Tasks, Criteria, Dependencies and Board state. Knowledge owns Decisions/Invariants and their revisions. Readiness owns deterministic versioned rules and snapshots. Repositories owns bounded read-only Git observations and Context Packages. Collaboration owns Agent Runs and Handoffs, without agent execution claims. Delivery owns Evidence/Verification/ReleaseCandidates with explicit trust scope. Transfer owns versioned import/export previews and atomic confirmation.

## Dependency direction

`web app -> web feature -> @forge-org/ui + @forge-org/api-client`, with `@forge-org/ui -> @forge-org/tokens` only. Domain-specific status-to-tone mapping belongs to the owning feature. The API follows adapters -> application -> domain, with infrastructure implementing domain ports. No direct React-to-filesystem access.

## Contracts

HTTP source of truth: backend Pydantic models and versioned OpenAPI. `packages/api-client` will use generated types and one transport boundary; do not hand-maintain duplicate DTOs. The initial health endpoint is public and non-sensitive. The desktop bridge requires a separate threat-model review before implementation.

## Runtime

Windows desktop (Tauri 2 + Rust, PyInstaller sidecar) is the first release target; browser + Vite is a dev runtime. No hosted/SaaS access in M1. SQLite + Alembic are the persistence target, but deliberately not bootstrapped for the health-only scaffold.
