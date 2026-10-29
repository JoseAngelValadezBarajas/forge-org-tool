import re
from pathlib import Path

ROOT = Path(__file__).parents[3]
MIGRATION = ROOT / 'supabase' / 'migrations' / '20261028_byoc_0004.sql'
ROLLBACK = ROOT / 'supabase' / 'rollback' / '20261028_byoc_0004.sql'


TRANSFER_FUNCTIONS = (
    'public.forge_transfer_preview(uuid, jsonb)',
    'public.forge_transfer_commit(uuid, jsonb, text)',
    'public.forge_transfer_contextual_preview(uuid, uuid, text, uuid, jsonb)',
    'public.forge_transfer_contextual_commit(uuid, uuid, text, uuid, jsonb, text)',
)


def test_digest_migration_exposes_pgcrypto_schema_to_all_transfer_rpcs() -> None:
    sql = MIGRATION.read_text(encoding='utf-8').lower()
    normalized = re.sub(r'\s+', ' ', sql)

    assert 'begin;' in sql
    assert 'commit;' in sql
    assert 'from the installed application' in sql
    assert 'create extension if not exists pgcrypto' in sql
    for function in TRANSFER_FUNCTIONS:
        assert f'alter function {function} set search_path = public, extensions;' in normalized


def test_digest_migration_rollback_restores_the_previous_rpc_search_path() -> None:
    sql = ROLLBACK.read_text(encoding='utf-8').lower()
    normalized = re.sub(r'\s+', ' ', sql)

    assert 'begin;' in sql
    assert 'commit;' in sql
    for function in TRANSFER_FUNCTIONS:
        assert f'alter function {function} set search_path = public;' in normalized
