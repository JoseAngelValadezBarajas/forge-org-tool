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
  remains in `infrastructure/connection.py`; migration execution lives in
  `infrastructure/migrations/runner.py`, legacy schema creation in
  `infrastructure/migrations/legacy_schema.py`, and persistence is split into
  cohesive organization/planning, repository/context, workbench, and delivery
  modules behind the `OrganizationRepository` facade. `sqlite.py` and `routes.py`
  are compatibility surfaces rather than storage locations for handlers or
  persistence implementation.
- Delivery state/mutations are coordinated by
  `features/delivery/useDeliveryController.ts`, with metrics in
  `DeliverySummary.tsx`; product semantics remain feature-owned.
- Tokens now emit the previously missing semantic variables, and a static
  reference check runs in architecture verification.
- Tokens, UI, and API client each produce package artifacts with declarations and
  export maps. A disposable external React/Vite consumer installs packed
  artifacts and verifies TypeScript, runtime bundling, CSS, React deduplication,
  theme switching, and a rendered interaction.

## Verification evidence

- Frontend typecheck, AST dependency/boundary checks, token checks, Vitest 26/26,
  ESLint with zero warnings, Prettier, package builds, external consumer test,
  and production build pass locally.
- API Ruff, strict mypy (51 source files), migration/boundary characterization,
  full API pytest (21/21), and OpenAPI drift check pass locally.
- Isolated Chromium smoke remains 18/18 across desktop and mobile, with a
  disposable API database and `reuseExistingServer: false`.
- GitHub Quality run `39534793241` passed the API and web jobs for commit
  `f907ad8`; the Windows desktop release build was still running when this
  record was drafted. The completed jobs include frontend format/lint/test/
  build/e2e and API Ruff/mypy/pytest/OpenAPI checks. A final CI run will be
  recorded after the follow-up architecture and persistence changes are pushed.

Rustfmt, Clippy, and desktop tests require the Rust toolchain and are verified
in Windows CI; they were not runnable in the current environment because
`cargo` is unavailable. Human Figma parity remains un-certified pending
external visual review.
