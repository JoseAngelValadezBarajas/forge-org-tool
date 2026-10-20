# M1 verification evidence

Focused audit implementation commit: `e8a24b2ec31b78fb5d7009463d615abfce72b430`.

The subsequent ORG-001 reconstruction evidence is recorded in
`docs/evidence/reconstruction/verification.md`; this M1 record remains the
foundation audit record.

## Local evidence

- Node/npm: Node 24.13.0, npm 11.6.2.
- Python/uv: Python 3.12.10, uv 0.12.7.
- `npm run test`: architecture boundaries passed, token check passed, typecheck passed, architecture tests 5/5, Vitest 7/7 across 2 files.
- `npm run build`: Vite production build passed; the development-only `/__components` route was absent from `apps/web/dist`.
- `npm run test:e2e`: isolated Chromium desktop/mobile smoke passed 4/4; Component Host dark/light screenshots are retained beside this file: `desktop-component-host-dark.png`, `desktop-component-host.png`, `mobile-component-host-dark.png`, and `mobile-gallery-light.png`.
- API: Ruff passed, strict mypy passed, pytest passed 2/2, OpenAPI check passed.
- Live API: `/api/v1/health` returned HTTP 200 with `scope=bootstrap-only`; fabricated `/api/v1/workspaces` returned HTTP 404.
- Public-file audit: no credential patterns, machine-specific absolute paths, databases, keys, logs, backups, or attachments were staged.
- Component Host: `/__components` renders public `@forge-org/ui` exports and the existing organization feature with deterministic local fixtures; it makes no backend calls.
- Playwright isolation: `reuseExistingServer: false`; the smoke starts its own server and does not silently attach to an occupied port.
- Shared contracts: Card default `div` and typed semantic option passed; Button loading/disabled/pressed DOM contract passed. Button visual parity remains unreviewed, including the 40px implementation height versus the 36/38px Figma reference.

## Clean-clone evidence

The final public repository was cloned into an isolated temporary directory. `npm ci`, the full frontend test/build gate, `uv sync --locked`, Ruff, strict mypy, pytest 2/2, OpenAPI verification, and clean-worktree checks passed. The clone reached the same final commit SHA.

## GitHub evidence

- Repository: `https://github.com/JoseAngelValadezBarajas/forge-org-tool`
- Visibility: public.
- Default branch: `main`.
- Quality workflow: success for the final commit.

## RED/GREEN notes

- API scaffold tests were already meaningful and passed before implementation changes; no artificial RED was manufactured.
- Focused Card contract tests first failed on the pre-existing `<section>` root; the typed neutral `div`/semantic option implementation produced 3/3 GREEN.
- Isolated Chromium smoke produced 4/4 GREEN and retained dark/light desktop/mobile evidence; hover behavior was checked in the browser.
- Clean-clone verification first exposed Windows line-ending sensitivity in token checks; `.gitattributes` fixed the repository-boundary defect and the fresh clone passed.

## Verdict

`M1_READY_FOR_REVIEW` for the focused audit corrections. GitHub Quality run `39375355053` passed for the implementation commit. Component parity remains `IMPLEMENTED_NOT_REVIEWED`; this does not claim CRUD, real-data migration, Tauri availability, feature parity, or Figma pixel parity.
