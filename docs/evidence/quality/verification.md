# Code quality and maintainability verification

## Scope

This initiative preserves the existing ORG-001 through ORG-009 behavior and
the public `organizationApi` facade. It adds repository quality gates and
focused structural boundaries; it does not change Figma variables, migrate
data, merge PR #1, or archive the original FORGE repository.

## Tooling

- Prettier is configured at repository root for handwritten TypeScript, React,
  CSS, JSON, Markdown, and YAML. Generated contracts, screenshots, lockfiles,
  historical artifacts, and local SDD metadata are excluded.
- Ruff formatter and lint are configured in `apps/api/pyproject.toml`.
- ESLint flat config uses TypeScript-aware parsing, React Hooks, JSX
  accessibility, unused-code, and type-only import rules.
- Rust formatting and Clippy commands target both desktop manifests.
- Root commands are documented in `CONTRIBUTING.md` and exposed through npm:
  `format`, `format:check`, `lint`, `lint:fix`, `typecheck`, `test`, `build`,
  and `quality`.

## Before / after indicators

- 113 handwritten/configuration files were mechanically formatted in commit
  `0956205`; generated contracts, screenshots, and historical artifacts were
  not reformatted.
- Ruff introduced one actionable exception-chain correction (`B904`); the
  API lint set now passes with no violations.
- ESLint initially found 17 React Hooks warnings. The warnings are now errors,
  all 17 are remediated, and the full repository lint run reports zero warnings
  and zero errors. Focused planning and organization tests cover stale-request
  protection.
- `@forge-org/api-client/src/index.ts` remains the compatibility facade while
  planning, readiness, repositories, context, transfer, workbench, and delivery
  operations are implemented in focused modules with shared response types.
- API dependency providers remain in `api/dependencies.py`. Connection lifecycle
  remains in `infrastructure/connection.py`; migration execution now lives in
  `infrastructure/migrations/runner.py` while the legacy schema and repository
  SQL remain unchanged for compatibility.
- Public route registration is composed into capability groups in
  `api/route_groups.py`; handler extraction from the 1,653-line legacy-compatible
  `routes.py` and cohesive repository extraction from `sqlite.py` remain open
  structural work.

## Verification evidence

- Frontend typecheck, architecture checks, token check, Vitest 25/25, ESLint,
  Prettier, and production build pass locally.
- API Ruff, migration characterization tests (3/3), full API pytest (25/25),
  and OpenAPI drift check pass locally. Strict mypy is not green: the existing
  application has 17 pre-existing untyped-service errors and the new route
  composition was reduced to a clean standalone module check.
- Existing isolated Chromium smoke remains 18/18; the same web journey suite
  passed in the final GitHub Quality run.
- GitHub Quality run `39530621562` passed web, API, and desktop for commit
  `2178531`, including frontend format/lint/test/build/e2e, API Ruff/mypy/
  pytest/OpenAPI checks, Rust format/Clippy/tests, desktop smoke tests, and the
  release build.

This record is not a certification: strict mypy and the remaining backend
handler/repository extraction findings still block `CODE_QUALITY_CERTIFIED`.
