# FORGE Org Tool agent rules

1. The project is **public**. Never commit credentials, real data, local paths, private backups, logs, tokens, or .env secrets.
2. Figma `r10szKLgiIPVi2NBmbjTpm` (pages 19 and 20) supplies design intent. Do not claim pixel parity until Chromium screenshots and token reconciliation are reviewed.
3. Frontend layering: `app` composes, `features` own business UI, `packages/ui` owns generic components, `packages/tokens` owns semantic tokens. `packages/ui` must not import API, app, features, or backend.
4. No duplicate Button, Input, Card, Badge, StatusChip implementations in features. Domain-specific presentation may compose those components and map domain state to visual tone.
5. Feature-to-feature imports require a documented `index.ts` public API; avoid deep imports across features.
6. Backend `domain` is framework-independent, `application` orchestrates transactions, `infrastructure` implements persistence/ports, `api` owns Pydantic/OpenAPI adapters.
7. All durable product state is backend-owned. localStorage is only for local presentation preferences.
8. Manual planning state or REPORTED evidence must never appear as VERIFIED, CI-passed, or deployed without named checks.
9. Desktop IPC never exposes a port, process capability, shell, arbitrary URL or unrestricted filesystem access to React.
10. Do not archive original FORGE until M0 preservation manifest and new public repository availability are verified. Archiving must require a separate deliberate operator step.
11. Keep phase-scoped changes; no unrelated refactor cycles. Run tests and provide evidence for every milestone.
12. Reusable package changes must pass their independent build and packed external-consumer test; consumers must not import package source paths.
13. Backend route and persistence moves require OpenAPI and migration characterization tests before and after extraction.
