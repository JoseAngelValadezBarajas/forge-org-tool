"""Text-level contract for the BYOC 0006/0007 migrations (work item due dates).

These tests read the SQL. They do not run it: Postgres is not available to this suite, so the
migrations must also be rehearsed on a disposable Supabase branch before production (see
docs/operations/byoc-supabase.md).
"""

import re
from pathlib import Path

ROOT = Path(__file__).parents[3]
MIGRATIONS = ROOT / 'supabase' / 'migrations'
ROLLBACKS = ROOT / 'supabase' / 'rollback'
BASE = MIGRATIONS / '20261026_byoc_0002.sql'
MIGRATION = MIGRATIONS / '20261119_byoc_0007.sql'
ROLLBACK = ROLLBACKS / '20261119_byoc_0007.sql'

TRANSFER_RPCS = (
    'forge_transfer_preview',
    'forge_transfer_commit',
    'forge_transfer_export',
    'forge_transfer_contextual_preview',
    'forge_transfer_contextual_commit',
    'forge_transfer_contextual_export',
)
# 0004 and 0005 hardened these four; the export functions keep `public`.
HARDENED = {
    'forge_transfer_preview',
    'forge_transfer_commit',
    'forge_transfer_contextual_preview',
    'forge_transfer_contextual_commit',
}
HARDENED_PATH = 'set search_path = pg_catalog, extensions, public'


def function_text(sql: str, name: str) -> str:
    start = sql.index(f'create or replace function public.{name}(')
    return sql[start : sql.index('\n$$;\n', start) + len('\n$$;\n')]


def normalized(sql: str) -> str:
    return re.sub(r'\s+', ' ', sql.lower())


def test_migration_is_owner_run_and_transactional() -> None:
    sql = MIGRATION.read_text('utf-8')
    assert sql.count('begin;') == 1
    assert sql.rstrip().endswith('commit;')
    assert 'from the installed application' in sql
    assert '20261119_byoc_0006.sql' in sql


def test_migration_replaces_every_transfer_rpc_once_and_keeps_the_live_search_path() -> None:
    sql = MIGRATION.read_text('utf-8')
    base = BASE.read_text('utf-8')
    for name in TRANSFER_RPCS:
        assert sql.count(f'create or replace function public.{name}(') == 1, name
        body = function_text(sql, name)
        expected = HARDENED_PATH if name in HARDENED else 'set search_path = public'
        assert expected in body.split('as $$')[0], name
        # The security mode must stay whatever 0002 chose (the commit RPCs are definers).
        security = re.search(r'security (definer|invoker)', function_text(base, name))
        assert security and security.group(0) in body.split('as $$')[0], name


def test_preview_rejects_non_iso_due_dates_and_contextual_preview_inherits_it() -> None:
    sql = MIGRATION.read_text('utf-8')
    assert 'forge_is_iso_date(nullif(feature->>' in function_text(sql, 'forge_transfer_preview')
    contextual = function_text(sql, 'forge_transfer_contextual_preview')
    assert 'public.forge_transfer_preview(' in contextual


def test_both_commit_paths_store_due_date_as_a_date() -> None:
    sql = MIGRATION.read_text('utf-8')
    for name in ('forge_transfer_commit', 'forge_transfer_contextual_commit'):
        body = normalized(function_text(sql, name))
        assert 'actual_result, tags, notes, due_date )' in body, name
        assert "nullif(feature->>'due_date', '')::date" in body, name


def test_export_emits_due_date_only_when_set_and_never_in_v1() -> None:
    body = normalized(function_text(MIGRATION.read_text('utf-8'), 'forge_transfer_export'))
    assert (
        "if p_schema_version <> 'forge-project-import-v1' and row_record.due_date is not null"
        in body
    )
    assert "to_char(row_record.due_date, 'yyyy-mm-dd')" in body


def test_helper_is_pure_locked_down_and_granted_to_authenticated_only() -> None:
    sql = MIGRATION.read_text('utf-8')
    body = normalized(function_text(sql, 'forge_is_iso_date'))
    assert 'immutable' in body
    assert 'set search_path = pg_catalog' in body
    assert "p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'" in sql
    flat = normalized(sql)
    assert 'revoke execute on function public.forge_is_iso_date(text) from anon, public;' in flat
    assert 'grant execute on function public.forge_is_iso_date(text) to authenticated;' in flat


def test_migration_does_not_touch_data_or_tables() -> None:
    flat = normalized(MIGRATION.read_text('utf-8'))
    for forbidden in (
        'drop table',
        'alter table',
        'delete from',
        'truncate',
    ):
        assert forbidden not in flat, forbidden
    assert not re.search(r'\bupdate\s+public\.', flat)


def test_rollback_restores_the_0002_definitions_exactly_and_drops_the_helper() -> None:
    base = BASE.read_text('utf-8')
    rollback = ROLLBACK.read_text('utf-8')
    assert rollback.count('begin;') == 1
    assert rollback.rstrip().endswith('commit;')
    for name in TRANSFER_RPCS:
        original = function_text(base, name)
        if name in HARDENED:
            original = original.replace('set search_path = public\n', f'{HARDENED_PATH}\n', 1)
        assert function_text(rollback, name) == original, name
        assert 'due_date' not in function_text(rollback, name), name
    assert 'drop function if exists public.forge_is_iso_date(text);' in rollback


def test_every_0002_grant_on_these_rpcs_is_preserved_by_replace() -> None:
    """CREATE OR REPLACE keeps privileges, so the migration must not need (or repeat) grants."""
    flat = normalized(MIGRATION.read_text('utf-8'))
    for name in TRANSFER_RPCS:
        assert f'grant execute on function public.{name}' not in flat, name


def test_verification_script_is_read_only() -> None:
    sql = (ROOT / 'supabase' / 'verify' / '20261119_byoc_0006_0007_verify.sql').read_text('utf-8')
    statements = [line for line in (re.sub(r'--.*', '', sql)).split(';') if line.strip()]
    assert statements
    assert all(statement.strip().lower().startswith('select') for statement in statements)
    flat = normalized(re.sub(r'--.*', '', sql))
    for forbidden in (
        'insert ',
        'update ',
        'delete ',
        'drop ',
        'alter ',
        'create ',
        'grant ',
        'revoke ',
    ):
        assert forbidden not in flat, forbidden
