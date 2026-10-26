import sqlite3
from pathlib import Path

import pytest

ROOT = Path(__file__).parents[3]
MIGRATION = ROOT / 'supabase' / 'migrations' / '20261026_byoc_0001.sql'
ROLLBACK = ROOT / 'supabase' / 'rollback' / '20261026_byoc_0001.sql'


def test_owner_migration_defines_the_first_byoc_vertical_slice_and_rls() -> None:
    sql = MIGRATION.read_text(encoding='utf-8').lower()

    for table in (
        'forge_schema_meta',
        'workspaces',
        'workspace_members',
        'projects',
        'epics',
        'features',
        'workspace_tags',
    ):
        assert f'create table if not exists public.{table}' in sql
        assert f'alter table public.{table} enable row level security' in sql

    assert 'forge-byoc-v1' in sql
    assert 'create or replace function public.forge_storage_preflight' in sql
    assert 'create or replace function public.forge_create_workspace' in sql
    assert 'auth.uid()' in sql
    assert 'grant execute on function public.forge_create_workspace' in sql
    assert 'with check (true)' not in sql


def test_membership_is_not_client_insertable_and_policies_are_membership_bound() -> None:
    sql = MIGRATION.read_text(encoding='utf-8').lower()

    assert 'grant insert on public.workspace_members' not in sql
    assert 'create policy workspace_members_insert' not in sql
    assert sql.count('workspace_members') >= 8
    assert 'exists (' in sql
    assert 'wm.user_id = auth.uid()' in sql
    assert 'wm.workspace_id = ' in sql


def test_rls_contract_has_no_client_bypass_for_membership_or_cross_workspace_writes() -> None:
    sql = MIGRATION.read_text(encoding='utf-8').lower()

    assert 'alter table public.workspace_members enable row level security' in sql
    assert 'create policy workspace_members_insert' not in sql
    assert 'grant insert on public.workspace_members' not in sql
    assert sql.count('with check (') >= 4
    assert 'join public.projects p on p.workspace_id = wm.workspace_id' in sql
    assert 'wm.user_id = auth.uid()' in sql


def test_features_reject_epics_from_a_different_project() -> None:
    sql = MIGRATION.read_text(encoding='utf-8').lower()

    assert 'unique (project_id, id)' in sql
    assert 'constraint features_epic_same_project_fk' in sql
    assert 'foreign key (project_id, epic_id)' in sql
    assert 'references public.epics (project_id, id)' in sql

    connection = sqlite3.connect(':memory:')
    connection.execute('PRAGMA foreign_keys = ON')
    connection.executescript(
        """
        create table epics (
            project_id text not null,
            id text not null,
            unique (project_id, id)
        );
        create table features (
            project_id text not null,
            epic_id text,
            foreign key (project_id, epic_id) references epics (project_id, id)
        );
        insert into epics values ('project-a', 'epic-a');
        insert into features values ('project-a', 'epic-a');
        """
    )

    with pytest.raises(sqlite3.IntegrityError):
        connection.execute("insert into features values ('project-b', 'epic-a')")


def test_rollback_only_removes_byoc_owned_objects_in_dependency_order() -> None:
    sql = ROLLBACK.read_text(encoding='utf-8').lower()

    assert 'drop function if exists public.forge_create_workspace' in sql
    assert 'drop function if exists public.forge_storage_preflight' in sql
    for table in (
        'workspace_tags',
        'features',
        'epics',
        'projects',
        'workspace_members',
        'workspaces',
        'forge_schema_meta',
    ):
        assert f'drop table if exists public.{table}' in sql
