"""Desktop-owned launch policy for the packaged FastAPI sidecar."""

from __future__ import annotations

import os
import secrets
import socket
import shutil
import subprocess
import sys
import json
import time
from urllib.error import URLError
from urllib.request import Request, urlopen
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

MIN_TOKEN_BYTES = 32
READINESS_TIMEOUT_SECONDS = 15


def app_data_root() -> Path:
    configured = os.environ.get('LOCALAPPDATA')
    if not configured:
        raise RuntimeError('LOCALAPPDATA is required for the desktop sidecar')
    return Path(configured) / 'ForgeOrgTool'


def local_paths() -> tuple[Path, Path]:
    root = app_data_root()
    return root / 'data' / 'forge.db', root / 'logs' / 'sidecar.log'


def backup_database(database_path: Path) -> Path | None:
    if not database_path.exists():
        return None
    backup_dir = app_data_root() / 'backups'
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')
    backup_path = backup_dir / f'forge-{timestamp}-{secrets.token_hex(4)}.db'
    shutil.copy2(database_path, backup_path)
    return backup_path


def free_loopback_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind(('127.0.0.1', 0))
        return int(server.getsockname()[1])


def sidecar_command(port: int) -> list[str]:
    configured = os.environ.get('FORGE_SIDECAR_COMMAND')
    if configured:
        command = json.loads(configured)
        if not isinstance(command, list) or not command or not all(
            isinstance(item, str) and item for item in command
        ):
            raise RuntimeError('FORGE_SIDECAR_COMMAND must be a non-empty JSON string list')
        return [*command, '--port', str(port)]
    return [
        sys.executable,
        '-m',
        'uvicorn',
        'forge_org.desktop_sidecar:app',
        '--host',
        '127.0.0.1',
        '--port',
        str(port),
    ]


def wait_for_readiness(port: int, token: str) -> None:
    deadline = time.monotonic() + READINESS_TIMEOUT_SECONDS
    request = Request(
        f'http://127.0.0.1:{port}/api/v1/health',
        headers={'Authorization': f'Bearer {token}'},
    )
    while time.monotonic() < deadline:
        try:
            with urlopen(request, timeout=1) as response:
                if response.status == 200:
                    return
        except (OSError, URLError):
            time.sleep(0.05)
    raise RuntimeError('Sidecar did not become ready before the startup timeout')


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
    backup_database(database_path)
    token = secrets.token_urlsafe(MIN_TOKEN_BYTES)
    port = free_loopback_port()
    environment = {
        **os.environ,
        'FORGE_DATABASE_PATH': str(database_path),
        'FORGE_SIDECAR_TOKEN': token,
    }
    log = log_path.open('ab')
    process = subprocess.Popen(
        sidecar_command(port),
        env=environment,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    log.close()
    if process.poll() is not None:
        raise RuntimeError('Sidecar exited before the sidecar became ready')
    wait_for_readiness(port, token)
    return SidecarSession(process=process, token=token, port=port)
