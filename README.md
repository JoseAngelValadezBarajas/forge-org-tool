# FORGE Org Tool

A new, public, local-first organizational tool for software work, with a self-contained visual system based on the existing FORGE Figma file.

**Status:** Active reconstruction baseline. The repository contains the local-first web product slices, versioned API contract, distributable shared packages, SQLite migrations, and a reserved Tauri desktop boundary. Figma visual parity and production desktop certification remain separately reviewed concerns.

**Figma:** https://www.figma.com/design/r10szKLgiIPVi2NBmbjTpm

**License:** New FORGE Org Tool code and documentation are offered under
[Apache-2.0](LICENSE). The original FORGE repository is a separate preserved
source reference under its own license; see [reconstruction provenance](docs/reconstruction/functional-parity.md).

## Scope and architecture

- `packages/tokens`: versioned semantic design-token JSON, generated CSS, token-reference checks, and a distributable CSS artifact.
- `packages/ui`: independently buildable, domain-independent accessible React components with declarations and CSS delivery. No feature, app, API or route imports.
- `packages/api-client`: independently buildable HTTP client with transport, error, typed capability modules, declarations, and a compatibility facade.
- `apps/web/src/app`: app composition, routes, shell and providers. No primitives here.
- `apps/web/src/features/<domain>`: feature routes, domain-specific presentation and business statuses. Compose `@forge-org/ui` rather than re-implementing buttons/cards.
- `apps/api`: Python FastAPI modular monolith with bounded capability routers, application services, migration runner, and persistence boundary; it owns durable state, rules, provenance and contracts.
- `apps/desktop`: Tauri 2 runtime boundary with Rust-owned capabilities and a separately certified sidecar/packaging workflow.

See [architecture](docs/architecture/README.md), [client component contracts](docs/architecture/client-components.md), [migration checkpoints](docs/migration/plan.md), and [safety policy](SECURITY.md).

The functional reconstruction inventory and staged implementation plan are in
[`docs/reconstruction`](docs/reconstruction/functional-parity.md). Stage 1
functionality remains subject to M1 review and explicit owner approval.

## Local bootstrap (Windows PowerShell)

Prerequisites: Node.js 24, npm 11, Python 3.12, uv and git. GitHub CLI (`gh`) is required only for repository publication and archival.

```powershell
npm install
npm run generate:tokens
npm run test
npm run dev
# separate PowerShell:
uv sync --project apps/api --group dev
uv run --project apps/api uvicorn forge_org.main:app --app-dir apps/api/src --reload
uv run --project apps/api pytest apps/api/tests
uv run --project apps/api python tooling/scripts/export-openapi.py --check
```

Open Vite's local URL for the shell. In development only, `/__components` showcases the actual public UI components and Component Host catalog. The backend exposes `GET /api/v1/health` and the local feature API. Package portability is verified with `npm run test:packages`, which builds and consumes packed artifacts outside workspace resolution.

**Before first public push:** generate and commit `package-lock.json` and `apps/api/uv.lock`; run the quality checks, review changes for secrets and personal data, and verify that local databases and backups are not tracked.

The original repository should not be archived until its refs, PR #30, contracts and any required _local_ data are preserved and signed off. Never push local data to the public repository.
