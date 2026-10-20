# M1 verification evidence

Final public repository commit: `17e1c39ca9ca369ee7942e75accfdbdab62c8e10`.

## Local evidence

- Node/npm: Node 24.13.0, npm 11.6.2.
- Python/uv: Python 3.12.10, uv 0.12.7.
- `npm run test`: architecture boundaries passed, token check passed, typecheck passed, architecture tests 5/5, Vitest 4/4.
- `npm run build`: Vite production build passed; the development-only `/__components` route was absent from `apps/web/dist`.
- `npm run test:e2e`: Chromium desktop/mobile smoke passed 4/4; Component Host screenshots are retained beside this file, including `desktop-component-host.png` and `mobile-gallery-light.png`.
- API: Ruff passed, strict mypy passed, pytest passed 2/2, OpenAPI check passed.
- Live API: `/api/v1/health` returned HTTP 200 with `scope=bootstrap-only`; fabricated `/api/v1/workspaces` returned HTTP 404.
- Public-file audit: no credential patterns, machine-specific absolute paths, databases, keys, logs, backups, or attachments were staged.
- Component Host: `/__components` renders public `@forge-org/ui` exports and the existing organization feature with deterministic local fixtures; it makes no backend calls.

## Clean-clone evidence

The final public repository was cloned into an isolated temporary directory. `npm ci`, the full frontend test/build gate, `uv sync --locked`, Ruff, strict mypy, pytest 2/2, OpenAPI verification, and clean-worktree checks passed. The clone reached the same final commit SHA.

## GitHub evidence

- Repository: `https://github.com/JoseAngelValadezBarajas/forge-org-tool`
- Visibility: public.
- Default branch: `main`.
- Quality workflow: success for the final commit.

## RED/GREEN notes

- API scaffold tests were already meaningful and passed before implementation changes; no artificial RED was manufactured.
- Frontend tests first failed because Testing Library was not installed, then ran with one isolation failure; explicit cleanup produced 3/3 GREEN.
- E2E first exposed a WebKit device-selection mistake and an ambiguous theme locator; Chromium-only mobile configuration and a scoped locator produced 4/4 GREEN.
- Clean-clone verification first exposed Windows line-ending sensitivity in token checks; `.gitattributes` fixed the repository-boundary defect and the fresh clone passed.

## Verdict

`M1_READY_FOR_REVIEW` for the scoped foundation and Component Host. Component parity remains `IMPLEMENTED_NOT_REVIEWED`; this does not claim CRUD, real-data migration, Tauri availability, feature parity, or Figma pixel parity.
