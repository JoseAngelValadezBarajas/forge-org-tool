-- Destructive owner-only rollback for BYOC 0.2. Export/backup first.
-- FORGE never invokes this file and it must not be used during application startup.

drop policy if exists tasks_select_member on public.tasks;
drop policy if exists tasks_insert_editor on public.tasks;
drop policy if exists tasks_update_editor on public.tasks;
drop policy if exists tasks_delete_editor on public.tasks;
drop policy if exists acceptance_criteria_select_member on public.acceptance_criteria;
drop policy if exists acceptance_criteria_insert_editor on public.acceptance_criteria;
drop policy if exists acceptance_criteria_update_editor on public.acceptance_criteria;
drop policy if exists acceptance_criteria_delete_editor on public.acceptance_criteria;
drop policy if exists feature_dependencies_select_member on public.feature_dependencies;
drop policy if exists feature_dependencies_insert_editor on public.feature_dependencies;
drop policy if exists feature_dependencies_update_editor on public.feature_dependencies;
drop policy if exists feature_dependencies_delete_editor on public.feature_dependencies;
drop policy if exists bug_attachments_select_member on public.bug_attachments;
drop policy if exists bug_attachments_insert_editor on public.bug_attachments;
drop policy if exists bug_attachments_delete_editor on public.bug_attachments;

-- Restore the 0.1 write policies that 0002 tightens for archived resources.
drop policy if exists projects_insert_editor on public.projects;
create policy projects_insert_editor on public.projects
    for insert to authenticated with check (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.projects.workspace_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists projects_update_editor on public.projects;
create policy projects_update_editor on public.projects
    for update to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.projects.workspace_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    ) with check (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.projects.workspace_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists epics_insert_editor on public.epics;
create policy epics_insert_editor on public.epics
    for insert to authenticated with check (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.epics.project_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists epics_update_editor on public.epics;
create policy epics_update_editor on public.epics
    for update to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.epics.project_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    ) with check (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.epics.project_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists features_insert_editor on public.features;
create policy features_insert_editor on public.features
    for insert to authenticated with check (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.features.project_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists features_update_editor on public.features;
create policy features_update_editor on public.features
    for update to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.features.project_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    ) with check (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.features.project_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists workspace_tags_insert_editor on public.workspace_tags;
create policy workspace_tags_insert_editor on public.workspace_tags
    for insert to authenticated with check (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.workspace_tags.workspace_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists workspace_tags_update_editor on public.workspace_tags;
create policy workspace_tags_update_editor on public.workspace_tags
    for update to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.workspace_tags.workspace_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    ) with check (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.workspace_tags.workspace_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop policy if exists workspace_tags_delete_editor on public.workspace_tags;
create policy workspace_tags_delete_editor on public.workspace_tags
    for delete to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.workspace_tags.workspace_id
              and wm.user_id = auth.uid() and wm.role in ('owner', 'editor')
        )
    );
drop trigger if exists tasks_active_project_guard on public.tasks;
drop trigger if exists acceptance_criteria_active_project_guard on public.acceptance_criteria;
drop trigger if exists feature_dependencies_acyclic_guard on public.feature_dependencies;
drop trigger if exists feature_dependencies_active_project_guard on public.feature_dependencies;
drop trigger if exists bug_attachments_active_project_guard on public.bug_attachments;
drop trigger if exists epics_active_project_guard on public.epics;
drop trigger if exists features_active_project_guard on public.features;
drop function if exists public.forge_transfer_contextual_export(uuid, uuid, text, uuid);
drop function if exists public.forge_transfer_contextual_commit(uuid, uuid, text, uuid, jsonb, text);
drop function if exists public.forge_transfer_contextual_preview(uuid, uuid, text, uuid, jsonb);
drop function if exists public.forge_transfer_export(uuid, uuid, text);
drop function if exists public.forge_transfer_commit(uuid, jsonb, text);
drop function if exists public.forge_transfer_preview(uuid, jsonb);
drop function if exists public.forge_finalize_import(uuid, uuid, uuid);
drop function if exists public.forge_delete_imported_project(uuid, uuid, uuid);
drop function if exists public.forge_delete_imported_project(uuid, uuid);
drop function if exists public.forge_owner_add_member(uuid, uuid, text);
drop function if exists public.forge_create_dependency(uuid, uuid, uuid);
drop function if exists public.forge_reorder_criteria(uuid, uuid[]);
drop function if exists public.forge_reorder_tasks(uuid, uuid[]);
drop function if exists public.forge_assert_active_feature_project();
drop function if exists public.forge_assert_dependency_acyclic();
drop function if exists public.forge_assert_active_project();
drop function if exists public.forge_project_role(uuid);
drop function if exists public.forge_workspace_role(uuid);
drop function if exists public.forge_bug_attachment_scope(uuid, uuid, uuid, boolean);
drop function if exists public.forge_project_is_active(uuid);
drop policy if exists forge_bug_attachments_read on storage.objects;
drop policy if exists forge_bug_attachments_write on storage.objects;
drop policy if exists forge_bug_attachments_delete on storage.objects;
delete from storage.buckets where id = 'forge-bug-attachments';
drop table if exists public.bug_attachments;
drop table if exists public.forge_import_sessions;
drop table if exists public.feature_dependencies;
drop table if exists public.acceptance_criteria;
drop table if exists public.tasks;
delete from public.forge_schema_meta where schema_version = 'forge-byoc-v2';

create or replace function public.forge_storage_preflight()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    installed_version text;
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;
    select schema_version into installed_version
    from public.forge_schema_meta
    where schema_version = 'forge-byoc-v1';
    if installed_version is null then
        raise exception 'unsupported FORGE BYOC schema' using errcode = '42P01';
    end if;
    return jsonb_build_object('schema_version', installed_version);
end;
$$;
grant execute on function public.forge_storage_preflight() to authenticated;
revoke execute on function public.forge_storage_preflight() from anon, public;
