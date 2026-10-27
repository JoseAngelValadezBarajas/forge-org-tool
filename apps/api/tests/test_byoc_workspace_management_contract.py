from pathlib import Path

ROOT = Path(__file__).parents[3]
MIGRATION = ROOT / 'supabase' / 'migrations' / '20261026_byoc_0003.sql'
ROLLBACK = ROOT / 'supabase' / 'rollback' / '20261026_byoc_0003.sql'


def test_workspace_delete_migration_is_incremental_owner_only_and_manual() -> None:
    sql = MIGRATION.read_text(encoding='utf-8').lower()

    assert 'begin;' in sql
    assert 'commit;' in sql
    assert 'forge_delete_workspace' in sql
    assert 'security definer' in sql
    assert "role = 'owner'" in sql
    assert 'auth.uid()' in sql
    assert 'grant execute on function public.forge_delete_workspace' in sql
    assert 'revoke execute on function public.forge_delete_workspace' in sql
    assert 'never run this from the installed application' in sql


def test_workspace_delete_verifies_storage_cleanup_without_deleting_storage_metadata() -> None:
    sql = MIGRATION.read_text(encoding='utf-8').lower()

    assert 'delete from storage.objects' not in sql
    assert 'from storage.objects' in sql
    assert 'workspace storage cleanup incomplete' in sql
    assert 'name = p_workspace_id::text' in sql
    assert "name like p_workspace_id::text || '/%'" in sql


def test_workspace_delete_rollback_is_owner_run() -> None:
    sql = ROLLBACK.read_text(encoding='utf-8').lower()
    assert 'forge_delete_workspace' in sql
    assert 'owner' in sql
    assert 'drop function if exists public.forge_delete_workspace(uuid)' in sql
