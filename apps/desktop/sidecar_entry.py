"""Packaged Python sidecar entry point used by the Tauri host."""

from __future__ import annotations

import argparse

import uvicorn

from forge_org.desktop_sidecar import sidecar_app_from_environment


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, required=True)
    args = parser.parse_args()
    app = sidecar_app_from_environment()
    uvicorn.run(app, host='127.0.0.1', port=args.port)


if __name__ == '__main__':
    main()
