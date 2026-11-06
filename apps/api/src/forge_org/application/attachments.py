"""Bounded, application-managed screenshot storage for Bug work items."""

import base64
import binascii
import hashlib
import os
import re
import struct
import uuid
from pathlib import Path
from typing import Any

from forge_org.application.ports import AttachmentStore
from forge_org.domain.clock import utc_now

MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
MAX_ATTACHMENTS_PER_BUG = 5
CONTENT_TYPES = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
}


class BugAttachmentService:
    def __init__(self, store: AttachmentStore, storage_root: Path) -> None:
        self.store = store
        self.storage_root = storage_root

    @staticmethod
    def _image_type(content: bytes) -> str | None:
        if content.startswith(b'\x89PNG\r\n\x1a\n') and len(content) >= 45:
            chunk_length = struct.unpack('>I', content[8:12])[0]
            if chunk_length != 13 or content[12:16] != b'IHDR':
                return None
            width, height = struct.unpack('>II', content[16:24])
            if not (1 <= width <= 16384 and 1 <= height <= 16384):
                return None
            if content[-8:-4] != b'IEND':
                return None
            return 'image/png'
        if content.startswith(b'\xff\xd8\xff') and content.endswith(b'\xff\xd9'):
            return 'image/jpeg'
        if (
            len(content) >= 12
            and content[:4] == b'RIFF'
            and content[8:12] == b'WEBP'
            and struct.unpack('<I', content[4:8])[0] + 8 == len(content)
        ):
            return 'image/webp'
        return None

    def _bug(
        self, workspace_id: str, project_id: str, feature_id: str, *, write: bool = False
    ) -> dict[str, Any]:
        bug = self.store.find_bug(workspace_id, project_id, feature_id)
        if bug is None:
            raise LookupError('Bug not found in this workspace and project')
        if write and bug['project_status'] != 'active':
            raise ValueError('Archived projects are read-only')
        return bug

    def list(self, workspace_id: str, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        self._bug(workspace_id, project_id, feature_id)
        return self.store.list_attachments(feature_id)

    def add(
        self,
        workspace_id: str,
        project_id: str,
        feature_id: str,
        file_name: str,
        declared_type: str,
        data_base64: str,
    ) -> dict[str, Any]:
        self._bug(workspace_id, project_id, feature_id, write=True)
        if len(data_base64) > ((MAX_ATTACHMENT_BYTES + 2) // 3) * 4:
            raise ValueError('Screenshot exceeds the 5 MiB limit')
        try:
            content = base64.b64decode(data_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError('Screenshot payload is not valid base64') from exc
        if not content or len(content) > MAX_ATTACHMENT_BYTES:
            raise ValueError('Screenshot must be between 1 byte and 5 MiB')
        detected_type = self._image_type(content)
        if detected_type is None or detected_type != declared_type:
            raise ValueError('Screenshot content does not match a supported image type')
        safe_name = file_name.replace('\\', '/').split('/')[-1].strip()
        if not safe_name or len(safe_name) > 255 or '\x00' in safe_name:
            raise ValueError('Screenshot filename is invalid')
        allowed_suffixes = {CONTENT_TYPES[detected_type]}
        if detected_type == 'image/jpeg':
            allowed_suffixes.add('.jpeg')
        if Path(safe_name).suffix.casefold() not in allowed_suffixes:
            raise ValueError('Screenshot extension does not match its content')
        attachment_id = str(uuid.uuid4())
        relative_path = f'{attachment_id}{CONTENT_TYPES[detected_type]}'
        self.storage_root.mkdir(parents=True, exist_ok=True)
        destination = self.storage_root / relative_path
        temporary = self.storage_root / f'.{attachment_id}.tmp'

        def persist_file() -> None:
            with temporary.open('xb') as output:
                output.write(content)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, destination)

        try:
            accepted = self.store.add_attachment(
                feature_id,
                {
                    'id': attachment_id,
                    'relative_path': relative_path,
                    'file_name': safe_name,
                    'content_type': detected_type,
                    'byte_size': len(content),
                    'sha256': hashlib.sha256(content).hexdigest(),
                    'created_at': utc_now(),
                },
                limit=MAX_ATTACHMENTS_PER_BUG,
                before_commit=persist_file,
            )
        except Exception:
            temporary.unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            raise
        if not accepted:
            raise ValueError('A Bug can have at most five screenshots')
        return next(
            item
            for item in self.list(workspace_id, project_id, feature_id)
            if item['id'] == attachment_id
        )

    def content(
        self, workspace_id: str, project_id: str, feature_id: str, attachment_id: str
    ) -> tuple[dict[str, Any], Path]:
        self._bug(workspace_id, project_id, feature_id)
        row = self.store.get_attachment(feature_id, attachment_id)
        if row is None:
            raise LookupError('Screenshot not found')
        relative_path = row['relative_path']
        if not re.fullmatch(r'[0-9a-f-]{36}\.(png|jpg|webp)', relative_path):
            raise RuntimeError('Screenshot storage reference is invalid')
        path = self.storage_root / relative_path
        if (
            self.storage_root.is_symlink()
            or path.parent != self.storage_root
            or path.is_symlink()
            or not path.is_file()
        ):
            raise LookupError('Screenshot content not found')
        return row, path

    def remove(
        self, workspace_id: str, project_id: str, feature_id: str, attachment_id: str
    ) -> None:
        self._bug(workspace_id, project_id, feature_id, write=True)
        _, path = self.content(workspace_id, project_id, feature_id, attachment_id)
        self.store.delete_attachment(feature_id, attachment_id)
        path.unlink(missing_ok=True)
