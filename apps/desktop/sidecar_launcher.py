"""Desktop-owned launch policy for the packaged FastAPI sidecar."""

from __future__ import annotations

import os
import secrets
import socket
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

MIN_TOKEN_BYTES = 32


def app_data_root() -> Path:
    configured = os.environ.get('LOCALAPPDATA')
    if not configured:
        raise RuntimeError('LOCALAPPDATA is required for the desktop sidecar')
    return Path(configured) / 'ForgeOrgTool'


def local_paths() -> tuple[Path, Path]:
    root = app_data_root()
    return root / 'data' / 'forge.db', root / 'logs' / 'sidecar.log'


def free_loopback_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind(('127.0.0.1', 0))
        return int(server.getsockname()[1])


@dataclass
class SidecarSession:
    process: subprocess.Popen[bytes]
    token: str
    port: int

    @property
    def base_url(self) -> str:
        return f'http://127.0.0.1:{self.port}'

    def stop(self) -> None:
        if self.process.poll() is not None:
            return
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)


def start_sidecar() -> SidecarSession:
    database_path, log_path = local_paths()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    token = secrets.token_urlsafe(MIN_TOKEN_BYTES)
    port = free_loopback_port()
    environment = {
        **os.environ,
        'FORGE_DATABASE_PATH': str(database_path),
        'FORGE_SIDECAR_TOKEN': token,
    }
    log = log_path.open('ab')
    process = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'forge_org.desktop_sidecar:app', '--host', '127.0.0.1', '--port', str(port)],
        env=environment,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    log.close()
    return SidecarSession(process=process, token=token, port=port)
