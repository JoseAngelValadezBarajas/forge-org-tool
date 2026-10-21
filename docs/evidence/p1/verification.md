# External architecture review evidence

Status: `ARCHITECTURE_NEEDS_CHANGES` remains open until the installed Windows
UI -> IPC -> sidecar -> SQLite persistence journey and human visual review are
complete.

## Verified corrections

- Desktop transport: commit `1638781` adds the Tauri `desktop_request` command,
  Rust-owned sidecar token/port/lifecycle, authenticated loopback requests,
  restart recovery, shutdown cleanup, and the web bridge. Browser fetch remains
  the fallback outside Tauri. Web bridge tests, web typecheck/build, and the
  Python desktop tests passed. Rust formatting, Clippy, host tests, release
  build, NSIS bundling, temporary installation, and installed application /
  packaged-sidecar launch smoke passed in GitHub Quality run
  [39544672180](https://github.com/JoseAngelValadezBarajas/forge-org-tool/actions/runs/39544672180)
  for commit `29368f4`. The run retained the `forge-org-tool-nsis` artifact.
- Backend compatibility: commit `37479d8` restores the complete legacy router
  surface and adds non-vacuous characterization/OpenAPI assertions. `uv run
  pytest tests -q` passed with 23 tests; one pre-existing Starlette/httpx
  deprecation warning remains.
- UI CSS distribution: commit `ae3e1b2` makes the aggregate stylesheet exclude CSS Module files;
  packed-consumer checks verify the installed package, generic selector
  isolation, theme behavior, and ESM consumer build. Native CSS-unaware Node
  execution is not advertised; bundler CSS extraction is required for SSR.

## Visual evidence boundaries

`figma-delivery-76-3.png` is retained as a Figma reference capture for node
`76:3`. The loaded Organization and Delivery desktop/mobile captures are
automated synthetic-data evidence only. Current Delivery differs materially
from the Figma composition; no human visual certification is claimed.

## Remaining required verification

- Direct installed UI -> Tauri IPC -> sidecar -> SQLite exercise, including
  restart and persistence. The CI smoke currently proves NSIS installation,
  installed application launch, and packaged-sidecar startup; the existing
  SQLite restart/persistence evidence is synthetic Python coverage, not that
  end-to-end UI journey.
- External human Figma review for the retained screenshots.

The readiness browser race found during the first full run was fixed in commit
`3103772` with a generation guard and a focused regression test. The complete
isolated Chromium suite subsequently passed 18/18 on desktop and mobile.

The Organization evidence journey now creates synthetic workspace/project data,
selects that workspace explicitly, and captures loaded desktop/mobile screens;
the Delivery journey captures loaded synthetic evidence. These are automated
browser artifacts, not human Figma certification.
