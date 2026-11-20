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


HARDENING = ROOT / 'supabase' / 'migrations' / '20261105_byoc_0005.sql'
HARDENING_ROLLBACK = ROOT / 'supabase' / 'rollback' / '20261105_byoc_0005.sql'


def test_search_path_hardening_resolves_trusted_schemas_before_public() -> None:
    sql = HARDENING.read_text(encoding='utf-8').lower()
    normalized = re.sub(r'\s+', ' ', sql)

    assert 'begin;' in sql
    assert 'commit;' in sql
    assert 'from the installed application' in sql
    for function in TRANSFER_FUNCTIONS:
        assert (
            f'alter function {function} set search_path = pg_catalog, extensions, public;'
            in normalized
        )


def test_search_path_hardening_rollback_restores_the_0004_state() -> None:
    sql = HARDENING_ROLLBACK.read_text(encoding='utf-8').lower()
    normalized = re.sub(r'\s+', ' ', sql)

    for function in TRANSFER_FUNCTIONS:
        assert f'alter function {function} set search_path = public, extensions;' in normalized


DUE_DATE = ROOT / 'supabase' / 'migrations' / '20261119_byoc_0006.sql'
DUE_DATE_ROLLBACK = ROOT / 'supabase' / 'rollback' / '20261119_byoc_0006.sql'


def test_due_date_migration_adds_a_nullable_column_without_rewriting_data() -> None:
    sql = DUE_DATE.read_text(encoding='utf-8').lower()
    normalized = re.sub(r'\s+', ' ', sql)

    assert 'begin;' in sql
    assert 'commit;' in sql
    assert 'from the installed application' in sql
    assert 'alter table public.features add column if not exists due_date date;' in normalized
    assert 'not null' not in normalized.split('due_date date')[1].split(';')[0]
    for destructive in ('drop ', 'delete ', 'update '):
        assert destructive not in normalized


def test_due_date_rollback_drops_only_the_column_and_its_index() -> None:
    sql = DUE_DATE_ROLLBACK.read_text(encoding='utf-8').lower()
    normalized = re.sub(r'\s+', ' ', sql)

    assert 'drop index if exists public.features_due_date_idx;' in normalized
    assert 'alter table public.features drop column if exists due_date;' in normalized
