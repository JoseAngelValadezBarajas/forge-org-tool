# Contributing

Use feature branches and reviewable PRs. Follow `AGENTS.md`, versioned API contracts and docs/architecture/client-components.md. Shared UI changes require a gallery example, keyboard and accessible-name tests, Dark/Light responsive visual evidence, and a documented Figma reference. Backend changes require deterministic behavior tests and fresh/incremental migration tests where schemas change. Do not update screenshots automatically. This repo is public: never include local SQLite files or secret material.

## Quality commands

The repository keeps npm workspaces, uv and Cargo as the authoritative
toolchains. Run the aggregate local gate with:

```bash
npm run quality
```

Individual checks are available through `npm run format`,
`npm run format:check`, `npm run lint`, `npm run lint:fix`,
`npm run typecheck`, `npm run test`, `npm run test:packages`, and
`npm run build`. `npm run build:packages` validates the distributable outputs
for tokens, UI, and API client before the web build.

The API client response types are generated from
`contracts/openapi/forge-org-v1.json`. Run `npm run check:api-types` after
backend contract changes; a non-empty diff means the generated client contract
must be reviewed and committed with the API change.

Python formatting/linting uses `uv run --project apps/api --locked ruff
format` and `ruff check`; Rust uses `cargo fmt` and `cargo clippy` against
both desktop manifests. CI runs the check variants and the existing browser,
API, and desktop suites.
