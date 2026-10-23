"""Bounded, checksum-verified ZIP packages for project planning and Bug images."""

import hashlib
import io
import json
import os
import stat
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any
from uuid import uuid4

from forge_org.application.attachments import (
    CONTENT_TYPES,
    MAX_ATTACHMENT_BYTES,
    BugAttachmentService,
)
from forge_org.application.transfer import SCHEMA_VERSION_V2, ProjectTransferService
from forge_org.infrastructure.connection import utc_now

MAX_PACKAGE_BYTES = 5 * 1024 * 1024
MAX_PACKAGE_ENTRIES = 100
MAX_EXPANDED_BYTES = 25 * 1024 * 1024


class ProjectPackageService:
    def __init__(self, transfer: ProjectTransferService, storage_root: Path) -> None:
        self.transfer = transfer
        self.connection = transfer.connection
        self.storage_root = storage_root
        self.attachments = BugAttachmentService(self.connection, storage_root)

    @staticmethod
    def _fingerprint(document: dict[str, Any], assets: list[dict[str, Any]]) -> str:
        canonical = json.dumps(
            {'document': document, 'attachments': assets},
            sort_keys=True,
            separators=(',', ':'),
            ensure_ascii=True,
        ).encode('utf-8')
        return hashlib.sha256(canonical).hexdigest()

    @staticmethod
    def _expected_path(feature_index: int, attachment_index: int, extension: str) -> str:
        return (
            f'attachments/feature-{feature_index + 1:03d}/'
            f'attachment-{attachment_index + 1:03d}{extension}'
        )

    def _read_package(self, archive_bytes: bytes) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        if not archive_bytes or len(archive_bytes) > MAX_PACKAGE_BYTES:
            raise ValueError('Project package must be between 1 byte and 5 MiB')
        try:
            archive = zipfile.ZipFile(io.BytesIO(archive_bytes))
        except (zipfile.BadZipFile, OSError) as exc:
            raise ValueError('Project package is not a valid ZIP archive') from exc

        with archive:
            infos = archive.infolist()
            if not infos or len(infos) > MAX_PACKAGE_ENTRIES:
                raise ValueError('Project package exceeds the entry count limit')
            seen: set[str] = set()
            total_size = 0
            for info in infos:
                name = info.filename
                entry_path = PurePosixPath(name)
                mode = info.external_attr >> 16
                if (
                    not name
                    or '\\' in name
                    or ':' in name
                    or any(ord(character) < 0x20 for character in name)
                    or entry_path.is_absolute()
                    or entry_path.as_posix() != name
                    or any(part in {'', '.', '..'} for part in entry_path.parts)
                    or info.is_dir()
                    or stat.S_ISLNK(mode)
                    or info.flag_bits & 0x1
                    or info.compress_type not in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}
                ):
                    raise ValueError('Project package contains an unsafe or unsupported ZIP entry')
                normalized_entry = '/'.join(entry_path.parts).casefold()
                if normalized_entry in seen:
                    raise ValueError('Project package contains duplicate normalized paths')
                seen.add(normalized_entry)
                total_size += info.file_size
                if total_size > MAX_EXPANDED_BYTES:
                    raise ValueError('Project package exceeds the expanded size limit')
                if info.file_size < 0 or info.compress_size < 0:
                    raise ValueError('Project package contains invalid size metadata')

            if 'manifest.json' not in seen:
                raise ValueError('Project package is missing manifest.json')
            try:
                manifest_bytes = archive.read('manifest.json')
                manifest = json.loads(manifest_bytes.decode('utf-8'))
            except (KeyError, UnicodeDecodeError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
                raise ValueError('Project package manifest is invalid') from exc
            if (
                not isinstance(manifest, dict)
                or manifest.get('schema_version') != SCHEMA_VERSION_V2
            ):
                raise ValueError('Project packages require the transfer v2 manifest')
            features = manifest.get('features')
            if not isinstance(features, list):
                raise ValueError('Project package features must be an array')

            asset_records: list[dict[str, Any]] = []
            found_paths = {'manifest.json'}
            archive_features: list[dict[str, Any]] = []
            for feature_index, feature in enumerate(features):
                if not isinstance(feature, dict):
                    raise ValueError('Project package features must be objects')
                feature_copy = dict(feature)
                declared_assets = feature_copy.pop('attachments', [])
                if not isinstance(declared_assets, list) or len(declared_assets) > 5:
                    raise ValueError('A Work Item can contain at most five attachments')
                if declared_assets and feature.get('kind') != 'bug':
                    raise ValueError('Only Bugs may contain screenshot attachments')
                for attachment_index, declared in enumerate(declared_assets):
                    if not isinstance(declared, dict):
                        raise ValueError('Attachment manifest entries must be objects')
                    content_type = declared.get('content_type')
                    if not isinstance(content_type, str):
                        raise ValueError('Project package attachment metadata is invalid')
                    extension = CONTENT_TYPES.get(content_type)
                    archive_path = declared.get('path')
                    expected_path = self._expected_path(
                        feature_index, attachment_index, extension or ''
                    )
                    file_name = declared.get('file_name')
                    checksum = declared.get('sha256')
                    byte_size = declared.get('byte_size')
                    if (
                        not extension
                        or archive_path != expected_path
                        or not isinstance(file_name, str)
                        or not file_name.strip()
                        or len(file_name) > 255
                        or '/' in file_name
                        or '\\' in file_name
                        or not isinstance(checksum, str)
                        or len(checksum) != 64
                        or not isinstance(byte_size, int)
                        or not 1 <= byte_size <= MAX_ATTACHMENT_BYTES
                    ):
                        raise ValueError('Project package attachment metadata is invalid')
                    try:
                        info = archive.getinfo(expected_path)
                        with archive.open(info) as stream:
                            content = stream.read(MAX_ATTACHMENT_BYTES + 1)
                    except (KeyError, OSError, RuntimeError, zipfile.BadZipFile) as exc:
                        raise ValueError(
                            'Project package attachment is missing or corrupt'
                        ) from exc
                    if (
                        len(content) != byte_size
                        or len(content) > MAX_ATTACHMENT_BYTES
                        or BugAttachmentService._image_type(content) != content_type
                        or hashlib.sha256(content).hexdigest() != checksum
                    ):
                        raise ValueError(
                            'Project package attachment checksum or image content is invalid'
                        )
                    found_paths.add(expected_path)
                    asset_records.append(
                        {
                            'feature_ref': feature_copy.get('ref'),
                            'file_name': file_name,
                            'content_type': content_type,
                            'byte_size': byte_size,
                            'sha256': checksum,
                            'path': expected_path,
                            'content': content,
                        }
                    )
                archive_features.append(feature_copy)

            if found_paths != seen:
                raise ValueError('Project package contains unreferenced files')
            manifest = dict(manifest)
            manifest['features'] = archive_features
            normalized_document = self.transfer.validate(manifest)
            document_size = len(self.transfer.canonical(normalized_document).encode('utf-8'))
            if document_size > 7 * 1024 * 1024:
                raise ValueError('Project package manifest exceeds the document limit')
            return normalized_document, asset_records

    def preview(self, workspace_id: str, archive_bytes: bytes) -> dict[str, Any]:
        document, assets = self._read_package(archive_bytes)
        preview = self.transfer.preview(workspace_id, document)
        fingerprint_assets = [
            {key: value for key, value in item.items() if key != 'content'} for item in assets
        ]
        preview['fingerprint'] = self._fingerprint(document, fingerprint_assets)
        preview['counts']['attachments'] = len(assets)
        return preview

    def export(self, workspace_id: str, project_id: str) -> bytes:
        document = self.transfer.export_project(workspace_id, project_id, SCHEMA_VERSION_V2)
        feature_rows = self.connection.execute(
            'SELECT id, kind FROM features WHERE project_id = ? ORDER BY created_at', (project_id,)
        ).fetchall()
        files: list[tuple[str, bytes]] = []
        for feature_index, (feature, row) in enumerate(
            zip(document['features'], feature_rows, strict=True)
        ):
            attachment_rows = (
                self.attachments.list(workspace_id, project_id, row['id'])
                if row['kind'] == 'bug'
                else []
            )
            feature['attachments'] = []
            for attachment_index, item in enumerate(attachment_rows):
                record, path = self.attachments.content(
                    workspace_id, project_id, row['id'], item['id']
                )
                content = path.read_bytes()
                checksum = hashlib.sha256(content).hexdigest()
                if checksum != record['sha256'] or len(content) != record['byte_size']:
                    raise ValueError('Stored Bug attachment failed integrity verification')
                archive_path = self._expected_path(
                    feature_index, attachment_index, CONTENT_TYPES[record['content_type']]
                )
                feature['attachments'].append(
                    {
                        'path': archive_path,
                        'file_name': record['file_name'],
                        'content_type': record['content_type'],
                        'byte_size': record['byte_size'],
                        'sha256': checksum,
                    }
                )
                files.append((archive_path, content))

        output = io.BytesIO()
        with zipfile.ZipFile(
            output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6
        ) as archive:
            archive.writestr('manifest.json', self.transfer.canonical(document).encode('utf-8'))
            for name, content in files:
                archive.writestr(name, content)
        result = output.getvalue()
        if len(result) > MAX_PACKAGE_BYTES:
            raise ValueError('Project package exceeds the 5 MiB desktop transfer limit')
        return result

    def import_project(
        self,
        workspace_id: str,
        archive_bytes: bytes,
        expected_fingerprint: str,
    ) -> dict[str, Any]:
        document, assets = self._read_package(archive_bytes)
        fingerprint_assets = [
            {key: value for key, value in item.items() if key != 'content'} for item in assets
        ]
        fingerprint = self._fingerprint(document, fingerprint_assets)
        if fingerprint != expected_fingerprint:
            raise RuntimeError('Import fingerprint does not match the reviewed project package')
        document_fingerprint = hashlib.sha256(
            self.transfer.canonical(document).encode('utf-8')
        ).hexdigest()
        staged: list[Path] = []
        published: list[Path] = []
        if self.storage_root.is_symlink():
            raise ValueError('Attachment storage root cannot be a symbolic link')
        self.storage_root.mkdir(parents=True, exist_ok=True)
        try:
            self.connection.execute('BEGIN IMMEDIATE')
            result = self.transfer.import_project(
                workspace_id, document, document_fingerprint, commit=False
            )
            generated = {item['ref']: item['generated_id'] for item in result['references']}
            for asset in assets:
                feature_id = generated.get(asset['feature_ref'])
                if feature_id is None:
                    raise ValueError('Attachment references an unknown Work Item')
                row = self.connection.execute(
                    'SELECT kind FROM features WHERE id = ? AND project_id = ?',
                    (feature_id, result['project_id']),
                ).fetchone()
                if row is None or row['kind'] != 'bug':
                    raise ValueError('Attachments may only be linked to Bugs')
                attachment_id = str(uuid4())
                extension = CONTENT_TYPES[asset['content_type']]
                relative_path = f'{attachment_id}{extension}'
                destination = self.storage_root / relative_path
                temporary = self.storage_root / f'.{attachment_id}.tmp'
                with temporary.open('xb') as output:
                    output.write(asset['content'])
                    output.flush()
                    os.fsync(output.fileno())
                staged.append(temporary)
                os.replace(temporary, destination)
                staged.remove(temporary)
                published.append(destination)
                self.connection.execute(
                    'INSERT INTO bug_attachments(id, feature_id, relative_path, file_name, '
                    'content_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        attachment_id,
                        feature_id,
                        relative_path,
                        asset['file_name'],
                        asset['content_type'],
                        asset['byte_size'],
                        asset['sha256'],
                        utc_now(),
                    ),
                )
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            for path in (*staged, *published):
                path.unlink(missing_ok=True)
            raise
        return {
            **result,
            'fingerprint': fingerprint,
            'counts': self.preview(workspace_id, archive_bytes)['counts'],
        }
