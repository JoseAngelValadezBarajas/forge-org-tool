# FORGE Org Tool agent rules

1. The project is **public**. Never commit credentials, real data, local paths, private backups, logs, tokens, or .env secrets.
2. Figma `r10szKLgiIPVi2NBmbjTpm` (pages 19 and 20) supplies design intent. Do not claim pixel parity until Chromium screenshots and token reconciliation are reviewed.
3. Frontend layering: `app` composes, `features` own business UI, `@corefoundry-labs/forge-ui` owns generic components and `@corefoundry-labs/forge-tokens` owns semantic tokens (both are published packages consumed by exact version, not workspace folders). Shared UI must not import API, app, features, or backend. `app` and every feature page keep state, effects and API calls in a sibling `use*.ts` hook (for example `app/shell/useApplicationShell.ts`, `planning/useEpicDetailController.ts`) and leave `*Page.tsx` / `App.tsx` as view composition; `tooling/scripts/feature-view-purity.test.mjs` enforces it.
4. No duplicate Button, Input, Card, Badge, StatusChip implementations in features. Domain-specific presentation may compose those components and map domain state to visual tone.
5. Feature-to-feature imports require a documented `index.ts` public API; avoid deep imports across features.
6. Backend `domain` is framework-independent, `application` orchestrates transactions, `infrastructure` implements persistence/ports, `api` owns Pydantic/OpenAPI adapters. `application` depends only on the protocols in `application/ports.py`; `api/dependencies.py` is the composition root that binds SQLite adapters. `apps/api/tests/test_layer_dependencies.py` enforces this and its allowlist must stay empty. The architecture is recorded in `docs/architecture/decisions/0003-hexagonal-backend.md`; pure rules go to `domain` first.
7. All durable product state is backend-owned. localStorage is only for local presentation preferences.
8. Manual planning state or REPORTED evidence must never appear as VERIFIED, CI-passed, or deployed without named checks.
9. Desktop IPC never exposes a port, process capability, shell, arbitrary URL or unrestricted filesystem access to React.
10. Do not archive original FORGE until M0 preservation manifest and new public repository availability are verified. Archiving must require a separate deliberate operator step.
11. Keep phase-scoped changes; no unrelated refactor cycles. Run tests and provide evidence for every milestone.
12. Reusable package changes must pass their independent build and packed external-consumer test; consumers must not import package source paths.
13. Backend route and persistence moves require OpenAPI and migration characterization tests before and after extraction.
14. Transfer and attachment rules exist in Python, Supabase SQL and the TypeScript client. Change `contracts/transfer/conformance.json` first; the Python and TypeScript conformance tests must both pass (see `docs/architecture/transfer-conformance.md`).
15. Do not keep unmounted capabilities in the tree. Retired product areas are removed from code; legacy SQLite tables are retained by migrations only.
