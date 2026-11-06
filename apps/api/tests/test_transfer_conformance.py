"""Cross-implementation conformance for transfer rules.

The same ``contracts/transfer/conformance.json`` is consumed by the TypeScript
api-client tests. SQLite (Python) and Supabase (SQL + TypeScript) must agree.
"""

import base64
import json
import re
from pathlib import Path

import pytest

from forge_org.application import attachments, project_package, transfer

ROOT = Path(__file__).parents[3]
CONFORMANCE = json.loads((ROOT / 'contracts' / 'transfer' / 'conformance.json').read_text('utf-8'))
LIMITS = CONFORMANCE['limits']


def test_python_constants_match_the_shared_limits() -> None:
    assert attachments.MAX_ATTACHMENT_BYTES == LIMITS['max_attachment_bytes']
    assert attachments.MAX_ATTACHMENTS_PER_BUG == LIMITS['max_attachments_per_bug']
    assert project_package.MAX_PACKAGE_BYTES == LIMITS['max_package_bytes']
    assert project_package.MAX_PACKAGE_ENTRIES == LIMITS['max_package_entries']
    assert project_package.MAX_EXPANDED_BYTES == LIMITS['max_expanded_bytes']
    assert transfer.MAX_DOCUMENT_BYTES == LIMITS['max_document_bytes']
    assert transfer.MAX_EPICS == LIMITS['max_epics']
    assert transfer.MAX_FEATURES == LIMITS['max_features']
    assert transfer.MAX_DEPENDENCIES == LIMITS['max_dependencies']
    assert transfer.MAX_TASKS == LIMITS['max_tasks']
    assert transfer.MAX_CRITERIA == LIMITS['max_criteria']


@pytest.mark.parametrize('vector', CONFORMANCE['image_vectors'], ids=lambda v: v['name'])
def test_image_detection_matches_the_shared_vectors(vector: dict[str, str | None]) -> None:
    content = base64.b64decode(vector['base64'] or '')
    assert attachments.BugAttachmentService._image_type(content) == vector['detected_type']


def test_supabase_migrations_use_the_shared_limits() -> None:
    sql = (ROOT / 'supabase' / 'migrations' / '20261026_byoc_0002.sql').read_text('utf-8')
    normalized = re.sub(r'\s+', ' ', sql)

    assert f'byte_size between 1 and {LIMITS["max_attachment_bytes"]}' in normalized
    assert f'file_size_limit = {LIMITS["max_attachment_bytes"]}' in normalized
    assert f'> {LIMITS["max_epics"]}' in normalized
    assert f'> {LIMITS["max_features"]}' in normalized
    assert f'> {LIMITS["max_dependencies"]}' in normalized
