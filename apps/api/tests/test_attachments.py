import base64
import os
import struct
import zlib
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def _png() -> bytes:
    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>2I5B', 1, 1, 8, 6, 0, 0, 0)
    ihdr = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data
    ihdr += struct.pack('>I', zlib.crc32(ihdr[4:]) & 0xFFFFFFFF)
    raw = b'\x00\x00\x00\x00\xff'
    compressed = zlib.compress(raw)
    image_data = struct.pack('>I', len(compressed)) + b'IDAT' + compressed
    image_data += struct.pack('>I', zlib.crc32(image_data[4:]) & 0xFFFFFFFF)
    end = struct.pack('>I', 0) + b'IEND'
    end += struct.pack('>I', zlib.crc32(end[4:]) & 0xFFFFFFFF)
    return signature + ihdr + image_data + end


def test_bug_attachments_are_validated_scoped_persistent_and_removable(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'attachments.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Screens'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Client'}
            ).json()
            bug = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/features',
                json={'title': 'Crash', 'kind': 'bug'},
            ).json()
            url = (
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
                f'/features/{bug["id"]}/attachments'
            )
            content = _png()
            uploaded = client.post(
                url,
                json={
                    'file_name': '../screen.png',
                    'content_type': 'image/png',
                    'data_base64': base64.b64encode(content).decode('ascii'),
                },
            )
            assert uploaded.status_code == 201
            attachment = uploaded.json()
            assert attachment['file_name'] == 'screen.png'
            assert attachment['byte_size'] == len(content)
            image = client.get(url + f'/{attachment["id"]}/content')
            assert image.status_code == 200
            assert image.content == content
            assert image.headers['content-type'] == 'image/png'

            wrong_signature = client.post(
                url,
                json={
                    'file_name': 'fake.png',
                    'content_type': 'image/png',
                    'data_base64': base64.b64encode(b'<svg></svg>').decode('ascii'),
                },
            )
            assert wrong_signature.status_code == 422
            wrong_content_type = client.post(
                url,
                json={
                    'file_name': 'screen.jpg',
                    'content_type': 'image/jpeg',
                    'data_base64': base64.b64encode(content).decode('ascii'),
                },
            )
            assert wrong_content_type.status_code == 422

            reopened = TestClient(create_app())
            assert reopened.get(url + f'/{attachment["id"]}/content').content == content
            assert reopened.delete(url + f'/{attachment["id"]}').status_code == 204
            assert reopened.get(url + f'/{attachment["id"]}/content').status_code == 404
            reopened.close()
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
