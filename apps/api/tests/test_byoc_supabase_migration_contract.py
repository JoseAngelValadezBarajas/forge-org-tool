from pathlib import Path

ROOT = Path(__file__).parents[3]
MIGRATION = ROOT / 'supabase' / 'migrations' / '20261026_byoc_0002.sql'
ROLLBACK = ROOT / 'supabase' / 'rollback' / '20261026_byoc_0002.sql'


def test_byoc_02_migration_is_incremental_and_owner_run() -> None:
    sql = MIGRATION.read_text(encoding='utf-8')

    assert 'begin;' in sql.lower()
    assert 'commit;' in sql.lower()
    assert 'forge-byoc-v2' in sql
    assert 'create table if not exists public.tasks' in sql
    assert 'create table if not exists public.acceptance_criteria' in sql
    assert 'create table if not exists public.feature_dependencies' in sql
    assert 'create table if not exists public.bug_attachments' in sql
    assert 'features_epic_same_project_fk' in sql
    assert 'forge_bug_attachment_scope' in sql
    assert 'forge_project_is_active' in sql
    assert 'epics_active_project_guard' in sql
    assert 'features_active_project_guard' in sql
    assert 'w.archived_at is null' in sql
    assert "p.status = 'active'" in sql
    assert 'feature_dependencies_blocking_same_project_fk' in sql
    assert 'feature_dependencies_blocked_same_project_fk' in sql
    assert "'forge-bug-attachments'" in sql
    assert 'alter table public.tasks enable row level security' in sql
    assert 'alter table public.bug_attachments enable row level security' in sql
    assert 'forge_reorder_tasks' in sql
    assert 'forge_reorder_criteria' in sql
    assert 'forge_create_dependency' in sql
    assert 'dependency graph contains a cycle' in sql
    assert 'forge_transfer_preview' in sql
    assert 'forge_transfer_commit' in sql
    assert 'forge_transfer_contextual_commit' in sql
    assert 'forge_owner_add_member' in sql


def test_byoc_02_migration_does_not_claim_to_run_from_the_client() -> None:
    sql = MIGRATION.read_text(encoding='utf-8')
    assert 'installed application' in sql
    assert 'never run this from the installed application' in sql.lower()


def test_byoc_02_rollback_restores_the_01_preflight_and_policies() -> None:
    sql = ROLLBACK.read_text(encoding='utf-8')

    assert 'forge_storage_preflight' in sql
    assert 'forge-byoc-v1' in sql
    assert 'restore the 0.1 write policies' in sql.lower()
    assert 'drop function if exists public.forge_project_is_active(uuid)' in sql


def test_byoc_02_binds_contextual_fingerprints_and_storage_metadata() -> None:
    sql = MIGRATION.read_text(encoding='utf-8')

    assert "'scope', p_scope" in sql
    assert "'workspace_id', p_workspace_id" in sql
    assert "'project_id', p_project_id" in sql
    assert "'destination_id', p_destination_id" in sql
    assert 'storage.objects' in sql
    assert "metadata->>'size'" in sql
    assert "metadata->>'mimetype'" in sql
