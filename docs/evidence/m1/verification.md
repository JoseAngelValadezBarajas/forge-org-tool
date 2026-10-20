# M1 verification evidence

Final public repository commit: `786c58f7bdaacc9c130e4f84cd67210acb8b2528`.

## Local evidence

- Node/npm: Node 24.13.0, npm 11.6.2.
- Python/uv: Python 3.12.10, uv 0.12.7.
- `npm run test`: architecture boundaries passed, token check passed, typecheck passed, architecture tests 5/5, Vitest 3/3.
- `npm run build`: Vite production build passed; gallery markers were absent from `apps/web/dist`.
- `npm run test:e2e`: Chromium desktop/mobile smoke passed 4/4; screenshots are retained beside this file.
- API: Ruff passed, strict mypy passed, pytest passed 2/2, OpenAPI check passed.
- Live API: `/api/v1/health` returned HTTP 200 with `scope=bootstrap-only`; fabricated `/api/v1/workspaces` returned HTTP 404.
- Public-file audit: no credential patterns, machine-specific absolute paths, databases, keys, logs, backups, or attachments were staged.

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

`M1_READY_FOR_REVIEW` for the scoped foundation. This does not claim CRUD, real-data migration, Tauri availability, feature parity, or Figma pixel parity.
