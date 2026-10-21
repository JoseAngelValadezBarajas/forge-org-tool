# External architecture review evidence

Status: `ARCHITECTURE_NEEDS_CHANGES` remains open until installed Windows
certification and human visual review are complete.

## Verified corrections

- Desktop transport: commit `1638781` adds the Tauri `desktop_request` command,
  Rust-owned sidecar token/port/lifecycle, authenticated loopback requests,
  restart recovery, shutdown cleanup, and the web bridge. Browser fetch remains
  the fallback outside Tauri. Web bridge tests, web typecheck/build, and the
  Python desktop tests passed. Rust and installed NSIS execution remain to be
  verified in a Windows toolchain/runner.
- Backend compatibility: commit `37479d8` restores the complete legacy router
  surface and adds non-vacuous characterization/OpenAPI assertions. `uv run
  pytest tests -q` passed with 23 tests; one pre-existing Starlette/httpx
  deprecation warning remains.
- UI CSS distribution: the aggregate stylesheet now excludes CSS Module files;
  packed-consumer checks verify the installed package, generic selector
  isolation, theme behavior, and ESM consumer build. Native CSS-unaware Node
  execution is not advertised; bundler CSS extraction is required for SSR.

## Visual evidence boundaries

`figma-delivery-76-3.png` is retained as a Figma reference capture for node
`76:3`. The existing Organization desktop capture remains a loading state, so
it is not evidence of loaded-content parity. Current Delivery differs materially
from the Figma composition; no human visual certification is claimed. A fresh
loaded-content capture was not retained because the isolated browser server
exited before producing valid evidence.

## Remaining required verification

- Rust `cargo check`, rustfmt, and Clippy in the supported Windows toolchain.
- Real NSIS installer build and isolated installed UI -> Tauri IPC -> sidecar ->
  SQLite smoke, including restart and persistence.
- Isolated Chromium journeys with retained loaded Organization and Delivery
  desktop/mobile evidence.
- GitHub Quality CI on the integrated commits.
