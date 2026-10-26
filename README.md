# FORGE Org Tool

A new, public, local-first organizational tool for software work, with a self-contained visual system based on the existing FORGE Figma file.

**Status:** FORGE Org Tool 1.0 local-first MVP implementation. Product scope and acceptance are defined in [`docs/product/mvp-1.0.md`](docs/product/mvp-1.0.md); see [`docs/quality/mvp-1.0-acceptance.md`](docs/quality/mvp-1.0-acceptance.md) for testable delivery evidence. Automated behavior checks do not certify human-reviewed Figma visual parity.

**Figma:** https://www.figma.com/design/r10szKLgiIPVi2NBmbjTpm

**License:** New FORGE Org Tool code and documentation are offered under
[Apache-2.0](LICENSE). The original FORGE repository is a separate preserved
source reference under its own license; the active product scope is documented
in [`docs/product/mvp-1.0.md`](docs/product/mvp-1.0.md).

## Scope and architecture

- `@corefoundry-labs/forge-tokens`, `@corefoundry-labs/forge-icons`, and `@corefoundry-labs/forge-ui`: public, versioned visual packages published from [`forge-org-packages`](https://github.com/JoseAngelValadezBarajas/forge-org-packages) on GitHub Packages.
- `packages/api-client`: the only package kept locally in FORGE; it is private, application-specific, and is never published.
- `packages/api-client`: independently buildable HTTP client with transport, error, typed capability modules, declarations, and a compatibility facade.
- `apps/web/src/app`: app composition, routes, shell and providers. No primitives here.
- `apps/web/src/features/<domain>`: feature routes, domain-specific presentation and business statuses. Compose `@corefoundry-labs/forge-ui` rather than re-implementing buttons/cards.
- `apps/api`: Python FastAPI modular monolith with bounded capability routers, application services, migration runner, and persistence boundary; it owns durable state, rules, provenance and contracts.
- `apps/desktop`: Tauri 2 runtime boundary with Rust-owned capabilities and a separately certified sidecar/packaging workflow.

See [architecture](docs/architecture/README.md), [client component contracts](docs/architecture/client-components.md), and [safety policy](SECURITY.md).

The 1.0 implementation keeps Organization, Planning, Project Transfer and shared UI in scope. Advanced capabilities from the original product inventory are not part of the active 1.0 product; see [`docs/product/mvp-1.0.md`](docs/product/mvp-1.0.md). The original FORGE repository and PRs are not modified or archived by this work.

Project Transfer supports legacy v1 JSON import, v2 JSON planning export/import, and v2 ZIP packages that include validated Bug screenshots. Package transfer is limited to 5 MiB compressed to remain within the Desktop sidecar request boundary; see [`docs/import-export/README.md`](docs/import-export/README.md) for the package manifest, checksums and rejected archive conditions.

## Local bootstrap (Windows PowerShell)

Prerequisites: Node.js 24, npm 11, Python 3.12, uv and git. Rust toolchain is required for native Tauri development/builds.

```powershell
npm ci
npm run generate:tokens
npm run test
npm run dev
# separate PowerShell:
uv sync --project apps/api --group dev
uv run --project apps/api uvicorn forge_org.main:app --app-dir apps/api/src --reload
uv run --project apps/api pytest -q
python tooling/scripts/export-openapi.py --check
```

Open Vite's local URL for the shell. In development only, `/__components` previews shared UI and in-scope product compositions. The backend exposes the local feature API and owns durable SQLite data. Package portability is verified with `npm run test:packages`, which builds and consumes packed artifacts outside workspace resolution.

Never commit credentials, local paths, operator databases or private backups. The original repository is a separate preserved source reference; this MVP work does not archive or rewrite it. Never upload local user data to the public repository or CI.
