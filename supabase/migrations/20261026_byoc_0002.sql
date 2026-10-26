-- FORGE BYOC 0.2 incremental owner-run migration.
-- Never run this from the installed application. It extends the already-applied
-- 20261026_byoc_0001.sql and is safe to re-run in the owner's project.

begin;

create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    feature_id uuid not null references public.features(id) on delete cascade,
    title text not null check (length(trim(title)) between 1 and 400),
    description text check (description is null or length(description) <= 4000),
    status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
    position integer not null default 0 check (position >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.acceptance_criteria (
    id uuid primary key default gen_random_uuid(),
    feature_id uuid not null references public.features(id) on delete cascade,
    description text not null check (length(trim(description)) between 1 and 4000),
    satisfied boolean not null default false,
    position integer not null default 0 check (position >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.feature_dependencies (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    blocking_feature_id uuid not null,
    blocked_feature_id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (project_id, blocking_feature_id, blocked_feature_id),
    check (blocking_feature_id <> blocked_feature_id)
);

create table if not exists public.bug_attachments (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null,
    project_id uuid not null,
    feature_id uuid not null,
    storage_path text not null unique,
    file_name text not null check (length(file_name) between 1 and 255),
    content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
    byte_size bigint not null check (byte_size between 1 and 5242880),
    sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    created_at timestamptz not null default now()
);

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'projects_workspace_id_id_key'
    ) then
        alter table public.projects add constraint projects_workspace_id_id_key unique (workspace_id, id);
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'features_project_id_id_key'
    ) then
        alter table public.features add constraint features_project_id_id_key unique (project_id, id);
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'features_epic_same_project_fk'
    ) then
        alter table public.features
            add constraint features_epic_same_project_fk
            foreign key (project_id, epic_id) references public.epics (project_id, id);
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'feature_dependencies_blocking_same_project_fk'
    ) then
        alter table public.feature_dependencies
            add constraint feature_dependencies_blocking_same_project_fk
            foreign key (project_id, blocking_feature_id)
            references public.features (project_id, id) on delete cascade;
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'feature_dependencies_blocked_same_project_fk'
    ) then
        alter table public.feature_dependencies
            add constraint feature_dependencies_blocked_same_project_fk
            foreign key (project_id, blocked_feature_id)
            references public.features (project_id, id) on delete cascade;
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'bug_attachments_project_feature_fk'
    ) then
        alter table public.bug_attachments
            add constraint bug_attachments_project_feature_fk
            foreign key (project_id, feature_id)
            references public.features (project_id, id) on delete cascade;
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'bug_attachments_workspace_project_fk'
    ) then
        alter table public.bug_attachments
            add constraint bug_attachments_workspace_project_fk
            foreign key (workspace_id, project_id)
            references public.projects (workspace_id, id) on delete cascade;
    end if;
end;
$$;

create index if not exists tasks_feature_position_idx
    on public.tasks (feature_id, position, id);
create index if not exists acceptance_criteria_feature_position_idx
    on public.acceptance_criteria (feature_id, position, id);
create index if not exists feature_dependencies_project_idx
    on public.feature_dependencies (project_id, created_at, id);
create index if not exists bug_attachments_feature_idx
    on public.bug_attachments (project_id, feature_id, created_at, id);

create or replace function public.forge_workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
$$;

create or replace function public.forge_project_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select public.forge_workspace_role(workspace_id)
    from public.projects where id = p_project_id
$$;

create or replace function public.forge_bug_attachment_scope(
    p_workspace_id uuid, p_project_id uuid, p_feature_id uuid, p_write boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select case when p_write
        then public.forge_workspace_role(p_workspace_id) in ('owner', 'editor')
        else public.forge_workspace_role(p_workspace_id) is not null
    end
    and exists (
        select 1
        from public.projects p
        join public.features f on f.project_id = p.id
        join public.workspaces w on w.id = p.workspace_id
        where p.id = p_project_id
          and p.workspace_id = p_workspace_id
          and f.id = p_feature_id
          and f.kind = 'bug'
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
$$;

create or replace function public.forge_project_is_active(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.projects p
        join public.workspaces w on w.id = p.workspace_id
        where p.id = p_project_id
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
$$;

create or replace function public.forge_assert_active_project()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
    target_project uuid;
begin
    if tg_table_name in ('tasks', 'acceptance_criteria') then
        target_project := (
            select project_id from public.features
            where id = case when tg_op = 'DELETE' then old.feature_id else new.feature_id end
        );
    else
        target_project := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
    end if;
    if not public.forge_project_is_active(target_project) then
        raise exception 'archived projects are read-only' using errcode = '55000';
    end if;
    if tg_op = 'UPDATE' and tg_table_name in ('epics', 'features') and new.project_id <> old.project_id then
        raise exception 'records cannot move between projects' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and tg_table_name in ('tasks', 'acceptance_criteria') and exists (
        select 1
        from public.features old_feature
        where old_feature.id = old.feature_id
          and old_feature.project_id <> target_project
    ) then
        raise exception 'records cannot move between projects' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and tg_table_name = 'feature_dependencies' and new.project_id <> old.project_id then
        raise exception 'records cannot move between projects' using errcode = '23514';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists epics_active_project_guard on public.epics;
create trigger epics_active_project_guard
before insert or update or delete on public.epics
for each row execute function public.forge_assert_active_project();

drop trigger if exists features_active_project_guard on public.features;
create trigger features_active_project_guard
before insert or update or delete on public.features
for each row execute function public.forge_assert_active_project();

drop trigger if exists tasks_active_project_guard on public.tasks;
create trigger tasks_active_project_guard
before insert or update or delete on public.tasks
for each row execute function public.forge_assert_active_project();

drop trigger if exists acceptance_criteria_active_project_guard on public.acceptance_criteria;
create trigger acceptance_criteria_active_project_guard
before insert or update or delete on public.acceptance_criteria
for each row execute function public.forge_assert_active_project();

drop trigger if exists feature_dependencies_active_project_guard on public.feature_dependencies;
create trigger feature_dependencies_active_project_guard
before insert or update or delete on public.feature_dependencies
for each row execute function public.forge_assert_active_project();

create or replace function public.forge_assert_active_feature_project()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
    target_project uuid;
    target_feature uuid;
    target_workspace uuid;
begin
    target_project := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
    target_feature := case when tg_op = 'DELETE' then old.feature_id else new.feature_id end;
    target_workspace := case when tg_op = 'DELETE' then old.workspace_id else new.workspace_id end;
    if not exists (
        select 1 from public.features
        where id = target_feature and project_id = target_project and kind = 'bug'
    ) then
        raise exception 'attachments are only supported for Bug work items' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' and (select count(*) from public.bug_attachments where feature_id = target_feature) >= 5 then
        raise exception 'a Bug can have at most five screenshots' using errcode = '54000';
    end if;
    if tg_op <> 'DELETE' and new.storage_path not like target_workspace::text || '/' || target_project::text || '/' || target_feature::text || '/%' then
        raise exception 'attachment storage path does not match its Bug' using errcode = '23514';
    end if;
    if not public.forge_project_is_active(target_project) then
        raise exception 'archived projects are read-only' using errcode = '55000';
    end if;
    if tg_op = 'UPDATE' and (new.project_id <> old.project_id or new.feature_id <> old.feature_id) then
        raise exception 'attachments cannot move between projects or Bugs' using errcode = '23514';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists bug_attachments_active_project_guard on public.bug_attachments;
create trigger bug_attachments_active_project_guard
before insert or update or delete on public.bug_attachments
for each row execute function public.forge_assert_active_feature_project();

alter table public.tasks enable row level security;
alter table public.acceptance_criteria enable row level security;
alter table public.feature_dependencies enable row level security;
alter table public.bug_attachments enable row level security;

-- Tighten the 0.1 write policies so archived workspaces and projects remain read-only.
drop policy if exists projects_insert_editor on public.projects;
create policy projects_insert_editor on public.projects
for insert to authenticated with check (
    exists (
        select 1
        from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.workspace_id = projects.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and w.archived_at is null
    )
);
drop policy if exists projects_update_editor on public.projects;
create policy projects_update_editor on public.projects
for update to authenticated
using (
    exists (
        select 1
        from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.workspace_id = projects.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and w.archived_at is null
    )
)
with check (
    exists (
        select 1
        from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.workspace_id = projects.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and w.archived_at is null
    )
);

drop policy if exists epics_insert_editor on public.epics;
create policy epics_insert_editor on public.epics
for insert to authenticated with check (
    exists (
        select 1
        from public.workspace_members wm
        join public.projects p on p.workspace_id = wm.workspace_id
        join public.workspaces w on w.id = p.workspace_id
        where p.id = epics.project_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
);
drop policy if exists epics_update_editor on public.epics;
create policy epics_update_editor on public.epics
for update to authenticated
using (
    exists (
        select 1
        from public.workspace_members wm
        join public.projects p on p.workspace_id = wm.workspace_id
        join public.workspaces w on w.id = p.workspace_id
        where p.id = epics.project_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
)
with check (
    exists (
        select 1
        from public.workspace_members wm
        join public.projects p on p.workspace_id = wm.workspace_id
        join public.workspaces w on w.id = p.workspace_id
        where p.id = epics.project_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
);

drop policy if exists features_insert_editor on public.features;
create policy features_insert_editor on public.features
for insert to authenticated with check (
    exists (
        select 1
        from public.workspace_members wm
        join public.projects p on p.workspace_id = wm.workspace_id
        join public.workspaces w on w.id = p.workspace_id
        where p.id = features.project_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
);
drop policy if exists features_update_editor on public.features;
create policy features_update_editor on public.features
for update to authenticated
using (
    exists (
        select 1
        from public.workspace_members wm
        join public.projects p on p.workspace_id = wm.workspace_id
        join public.workspaces w on w.id = p.workspace_id
        where p.id = features.project_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
)
with check (
    exists (
        select 1
        from public.workspace_members wm
        join public.projects p on p.workspace_id = wm.workspace_id
        join public.workspaces w on w.id = p.workspace_id
        where p.id = features.project_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and p.status = 'active'
          and p.archived_at is null
          and w.archived_at is null
    )
);

drop policy if exists workspace_tags_insert_editor on public.workspace_tags;
create policy workspace_tags_insert_editor on public.workspace_tags
for insert to authenticated with check (
    exists (
        select 1 from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.workspace_id = workspace_tags.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and w.archived_at is null
    )
);
drop policy if exists workspace_tags_update_editor on public.workspace_tags;
create policy workspace_tags_update_editor on public.workspace_tags
for update to authenticated
using (
    exists (
        select 1 from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.workspace_id = workspace_tags.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and w.archived_at is null
    )
)
with check (
    exists (
        select 1 from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.workspace_id = workspace_tags.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and w.archived_at is null
    )
);
drop policy if exists workspace_tags_delete_editor on public.workspace_tags;
create policy workspace_tags_delete_editor on public.workspace_tags
for delete to authenticated using (
    exists (
        select 1 from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.workspace_id = workspace_tags.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'editor')
          and w.archived_at is null
    )
);

drop policy if exists tasks_select_member on public.tasks;
create policy tasks_select_member on public.tasks for select to authenticated
using (public.forge_project_role((select project_id from public.features where id = tasks.feature_id)) is not null);
drop policy if exists tasks_insert_editor on public.tasks;
create policy tasks_insert_editor on public.tasks for insert to authenticated
with check (public.forge_project_is_active((select project_id from public.features where id = tasks.feature_id))
    and public.forge_project_role((select project_id from public.features where id = tasks.feature_id)) in ('owner', 'editor'));
drop policy if exists tasks_update_editor on public.tasks;
create policy tasks_update_editor on public.tasks for update to authenticated
using (public.forge_project_is_active((select project_id from public.features where id = tasks.feature_id))
    and public.forge_project_role((select project_id from public.features where id = tasks.feature_id)) in ('owner', 'editor'))
with check (public.forge_project_is_active((select project_id from public.features where id = tasks.feature_id))
    and public.forge_project_role((select project_id from public.features where id = tasks.feature_id)) in ('owner', 'editor'));
drop policy if exists tasks_delete_editor on public.tasks;
create policy tasks_delete_editor on public.tasks for delete to authenticated
using (public.forge_project_is_active((select project_id from public.features where id = tasks.feature_id))
    and public.forge_project_role((select project_id from public.features where id = tasks.feature_id)) in ('owner', 'editor'));

drop policy if exists acceptance_criteria_select_member on public.acceptance_criteria;
create policy acceptance_criteria_select_member on public.acceptance_criteria for select to authenticated
using (public.forge_project_role((select project_id from public.features where id = acceptance_criteria.feature_id)) is not null);
drop policy if exists acceptance_criteria_insert_editor on public.acceptance_criteria;
create policy acceptance_criteria_insert_editor on public.acceptance_criteria for insert to authenticated
with check (public.forge_project_is_active((select project_id from public.features where id = acceptance_criteria.feature_id))
    and public.forge_project_role((select project_id from public.features where id = acceptance_criteria.feature_id)) in ('owner', 'editor'));
drop policy if exists acceptance_criteria_update_editor on public.acceptance_criteria;
create policy acceptance_criteria_update_editor on public.acceptance_criteria for update to authenticated
using (public.forge_project_is_active((select project_id from public.features where id = acceptance_criteria.feature_id))
    and public.forge_project_role((select project_id from public.features where id = acceptance_criteria.feature_id)) in ('owner', 'editor'))
with check (public.forge_project_is_active((select project_id from public.features where id = acceptance_criteria.feature_id))
    and public.forge_project_role((select project_id from public.features where id = acceptance_criteria.feature_id)) in ('owner', 'editor'));
drop policy if exists acceptance_criteria_delete_editor on public.acceptance_criteria;
create policy acceptance_criteria_delete_editor on public.acceptance_criteria for delete to authenticated
using (public.forge_project_is_active((select project_id from public.features where id = acceptance_criteria.feature_id))
    and public.forge_project_role((select project_id from public.features where id = acceptance_criteria.feature_id)) in ('owner', 'editor'));

drop policy if exists feature_dependencies_select_member on public.feature_dependencies;
create policy feature_dependencies_select_member on public.feature_dependencies for select to authenticated
using (public.forge_project_role(project_id) is not null);
drop policy if exists feature_dependencies_insert_editor on public.feature_dependencies;
create policy feature_dependencies_insert_editor on public.feature_dependencies for insert to authenticated
with check (public.forge_project_is_active(project_id) and public.forge_project_role(project_id) in ('owner', 'editor'));
drop policy if exists feature_dependencies_update_editor on public.feature_dependencies;
create policy feature_dependencies_update_editor on public.feature_dependencies for update to authenticated
using (public.forge_project_is_active(project_id) and public.forge_project_role(project_id) in ('owner', 'editor'))
with check (public.forge_project_is_active(project_id) and public.forge_project_role(project_id) in ('owner', 'editor'));
drop policy if exists feature_dependencies_delete_editor on public.feature_dependencies;
create policy feature_dependencies_delete_editor on public.feature_dependencies for delete to authenticated
using (public.forge_project_is_active(project_id) and public.forge_project_role(project_id) in ('owner', 'editor'));

drop policy if exists bug_attachments_select_member on public.bug_attachments;
create policy bug_attachments_select_member on public.bug_attachments for select to authenticated
using (public.forge_project_role(project_id) is not null);
drop policy if exists bug_attachments_insert_editor on public.bug_attachments;
create policy bug_attachments_insert_editor on public.bug_attachments for insert to authenticated
with check (public.forge_project_is_active(project_id) and public.forge_project_role(project_id) in ('owner', 'editor'));
drop policy if exists bug_attachments_delete_editor on public.bug_attachments;
create policy bug_attachments_delete_editor on public.bug_attachments for delete to authenticated
using (public.forge_project_is_active(project_id) and public.forge_project_role(project_id) in ('owner', 'editor'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'forge-bug-attachments', 'forge-bug-attachments', false, 5242880,
    array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set public = false, file_size_limit = 5242880,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists forge_bug_attachments_read on storage.objects;
create policy forge_bug_attachments_read on storage.objects for select to authenticated
using (
    bucket_id = 'forge-bug-attachments'
    and public.forge_bug_attachment_scope(
        case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid end,
        case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[2])::uuid end,
        case when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[3])::uuid end,
        false
    )
);
drop policy if exists forge_bug_attachments_write on storage.objects;
create policy forge_bug_attachments_write on storage.objects for insert to authenticated
with check (
    bucket_id = 'forge-bug-attachments'
    and public.forge_bug_attachment_scope(
        case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid end,
        case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[2])::uuid end,
        case when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[3])::uuid end,
        true
    )
);
drop policy if exists forge_bug_attachments_delete on storage.objects;
create policy forge_bug_attachments_delete on storage.objects for delete to authenticated
using (
    bucket_id = 'forge-bug-attachments'
    and public.forge_bug_attachment_scope(
        case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid end,
        case when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[2])::uuid end,
        case when (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[3])::uuid end,
        true
    )
);

create or replace function public.forge_reorder_tasks(p_feature_id uuid, p_ids uuid[])
returns setof public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
    expected integer;
    supplied integer;
begin
    if not public.forge_project_is_active((select project_id from public.features where id = p_feature_id)) then
        raise exception 'archived projects are read-only' using errcode = '55000';
    end if;
    if public.forge_project_role((select project_id from public.features where id = p_feature_id)) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    select count(*) into expected from public.tasks where feature_id = p_feature_id;
    select count(distinct id) into supplied from unnest(coalesce(p_ids, '{}'::uuid[])) as id;
    if expected <> coalesce(array_length(p_ids, 1), 0) or expected <> supplied
        or exists (select 1 from unnest(coalesce(p_ids, '{}'::uuid[])) id where not exists (select 1 from public.tasks where tasks.id = id and tasks.feature_id = p_feature_id)) then
        raise exception 'reorder must contain every task exactly once' using errcode = '22023';
    end if;
    update public.tasks task
    set position = ordered.position, updated_at = now()
    from unnest(p_ids) with ordinality as ordered(id, position)
    where task.id = ordered.id and task.feature_id = p_feature_id;
    return query select * from public.tasks where feature_id = p_feature_id order by position, id;
end;
$$;

create or replace function public.forge_reorder_criteria(p_feature_id uuid, p_ids uuid[])
returns setof public.acceptance_criteria
language plpgsql
security invoker
set search_path = public
as $$
declare
    expected integer;
    supplied integer;
begin
    if not public.forge_project_is_active((select project_id from public.features where id = p_feature_id)) then
        raise exception 'archived projects are read-only' using errcode = '55000';
    end if;
    if public.forge_project_role((select project_id from public.features where id = p_feature_id)) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    select count(*) into expected from public.acceptance_criteria where feature_id = p_feature_id;
    select count(distinct id) into supplied from unnest(coalesce(p_ids, '{}'::uuid[])) as id;
    if expected <> coalesce(array_length(p_ids, 1), 0) or expected <> supplied
        or exists (select 1 from unnest(coalesce(p_ids, '{}'::uuid[])) id where not exists (select 1 from public.acceptance_criteria where acceptance_criteria.id = id and acceptance_criteria.feature_id = p_feature_id)) then
        raise exception 'reorder must contain every criterion exactly once' using errcode = '22023';
    end if;
    update public.acceptance_criteria criterion
    set position = ordered.position, updated_at = now()
    from unnest(p_ids) with ordinality as ordered(id, position)
    where criterion.id = ordered.id and criterion.feature_id = p_feature_id;
    return query select * from public.acceptance_criteria where feature_id = p_feature_id order by position, id;
end;
$$;

create or replace function public.forge_create_dependency(
    p_project_id uuid,
    p_blocking_feature_id uuid,
    p_blocked_feature_id uuid
)
returns public.feature_dependencies
language plpgsql
security invoker
set search_path = public
as $$
declare
    created public.feature_dependencies;
begin
    if not public.forge_project_is_active(p_project_id) then
        raise exception 'archived projects are read-only' using errcode = '55000';
    end if;
    if public.forge_project_role(p_project_id) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    if p_blocking_feature_id = p_blocked_feature_id then
        raise exception 'dependency cannot target itself' using errcode = '22023';
    end if;
    if not exists (select 1 from public.features where project_id = p_project_id and id = p_blocking_feature_id)
       or not exists (select 1 from public.features where project_id = p_project_id and id = p_blocked_feature_id) then
        raise exception 'dependency features must belong to the same project' using errcode = '23503';
    end if;
    if exists (
        with recursive reachable(id) as (
            select p_blocked_feature_id
            union
            select dependency.blocked_feature_id
            from public.feature_dependencies dependency join reachable on reachable.id = dependency.blocking_feature_id
            where dependency.project_id = p_project_id
        ) select 1 from reachable where id = p_blocking_feature_id
    ) then
        raise exception 'dependency graph contains a cycle' using errcode = '23514';
    end if;
    insert into public.feature_dependencies(project_id, blocking_feature_id, blocked_feature_id)
    values (p_project_id, p_blocking_feature_id, p_blocked_feature_id)
    returning * into created;
    return created;
end;
$$;

create or replace function public.forge_owner_add_member(
    p_workspace_id uuid, p_user_id uuid, p_role text default 'viewer'
)
returns public.workspace_members
language plpgsql
security definer
set search_path = public
as $$
declare
    created public.workspace_members;
begin
    if public.forge_workspace_role(p_workspace_id) <> 'owner' then
        raise exception 'workspace owner required' using errcode = '42501';
    end if;
    if p_role not in ('owner', 'editor', 'viewer') then
        raise exception 'invalid workspace role' using errcode = '22023';
    end if;
    insert into public.workspace_members(workspace_id, user_id, role)
    values (p_workspace_id, p_user_id, p_role)
    on conflict (workspace_id, user_id) do update set role = excluded.role
    returning * into created;
    return created;
end;
$$;

create or replace function public.forge_transfer_preview(
    p_workspace_id uuid, p_document jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    version text := p_document->>'schema_version';
    fingerprint text := encode(digest(convert_to(p_document::text, 'utf8'), 'sha256'), 'hex');
begin
    if public.forge_workspace_role(p_workspace_id) is null then
        raise exception 'workspace membership required' using errcode = '42501';
    end if;
    if version not in ('forge-project-import-v1', 'forge-project-transfer-v2') then
        raise exception 'unsupported project import schema' using errcode = '22023';
    end if;
    if nullif(trim(p_document->'project'->>'name'), '') is null then
        raise exception 'project name is required' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(p_document->'epics', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(p_document->'features', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(p_document->'dependencies', '[]'::jsonb)) <> 'array' then
        raise exception 'import collections must be arrays' using errcode = '22023';
    end if;
    if octet_length(convert_to(p_document::text, 'utf8')) > 7 * 1024 * 1024 then
        raise exception 'import document exceeds the 7 MiB limit' using errcode = '22023';
    end if;
    if jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) > 100
       or jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)) > 500
       or jsonb_array_length(coalesce(p_document->'dependencies', '[]'::jsonb)) > 5000 then
        raise exception 'import document exceeds collection limits' using errcode = '22023';
    end if;
    if exists (
        select 1 from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb)) item
        where jsonb_typeof(item) <> 'object'
    ) or exists (
        select 1 from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) item
        where jsonb_typeof(item) <> 'object'
    ) then
        raise exception 'import collection entries must be objects' using errcode = '22023';
    end if;
    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        where jsonb_typeof(feature) <> 'object'
           or jsonb_typeof(coalesce(feature->'tasks', '[]'::jsonb)) <> 'array'
           or jsonb_typeof(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) <> 'array'
    ) then
        raise exception 'feature child collections must be arrays' using errcode = '22023';
    end if;
    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        cross join jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) task
        where jsonb_typeof(task) <> 'object'
    ) or exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        cross join jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) criterion
        where jsonb_typeof(criterion) <> 'object'
    ) then
        raise exception 'nested import entries must be objects' using errcode = '22023';
    end if;
    if coalesce((
        select sum(jsonb_array_length(coalesce(feature->'tasks', '[]'::jsonb)))
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
    ), 0) > 2000
       or coalesce((
        select sum(jsonb_array_length(coalesce(feature->'acceptance_criteria', '[]'::jsonb)))
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
    ), 0) > 2000 then
        raise exception 'import document exceeds global task or criterion limits' using errcode = '22023';
    end if;
    if exists (
        with refs as (
            select value->>'ref' as ref from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb))
            union all
            select value->>'ref' from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb))
            union all
            select task->>'ref'
            from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
            cross join jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) task
            union all
            select criterion->>'ref'
            from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
            cross join jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) criterion
        )
        select ref from refs group by ref
        having ref is null or trim(ref) = '' or count(*) > 1
    ) then
        raise exception 'references must be unique and explicit' using errcode = '22023';
    end if;
    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        where nullif(feature->>'epic_ref', '') is not null
          and not exists (
              select 1 from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb)) epic
              where epic->>'ref' = feature->>'epic_ref'
          )
    ) then
        raise exception 'feature references an unknown epic' using errcode = '22023';
    end if;
    if exists (
        select 1 from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) dependency
        where dependency->>'blocking_feature_ref' = dependency->>'blocked_feature_ref'
           or not exists (select 1 from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature where feature->>'ref' = dependency->>'blocking_feature_ref')
           or not exists (select 1 from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature where feature->>'ref' = dependency->>'blocked_feature_ref')
    ) then
        raise exception 'dependency references are invalid' using errcode = '22023';
    end if;
    return jsonb_build_object(
        'schema_version', version,
        'fingerprint', fingerprint,
        'project', p_document->'project',
        'counts', jsonb_build_object(
            'epics', jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)),
            'features', jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)),
            'tasks', coalesce((select sum(jsonb_array_length(coalesce(value->'tasks', '[]'::jsonb))) from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb))), 0),
            'acceptance_criteria', coalesce((select sum(jsonb_array_length(coalesce(value->'acceptance_criteria', '[]'::jsonb))) from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb))), 0),
            'dependencies', jsonb_array_length(coalesce(p_document->'dependencies', '[]'::jsonb))
        )
    );
end;
$$;

create or replace function public.forge_transfer_commit(
    p_workspace_id uuid, p_document jsonb, p_expected_fingerprint text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    preview jsonb;
    project_id uuid := gen_random_uuid();
    epic_id uuid;
    feature_id uuid;
    task jsonb;
    criterion jsonb;
    epic jsonb;
    feature jsonb;
    dependency jsonb;
    epic_map jsonb := '{}'::jsonb;
    feature_map jsonb := '{}'::jsonb;
    now_value timestamptz := now();
    reference_rows jsonb := '[]'::jsonb;
begin
    if public.forge_workspace_role(p_workspace_id) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    preview := public.forge_transfer_preview(p_workspace_id, p_document);
    if preview->>'fingerprint' <> p_expected_fingerprint then
        raise exception 'import fingerprint does not match the reviewed document' using errcode = '40001';
    end if;
    insert into public.projects(id, workspace_id, name, description)
    values (project_id, p_workspace_id, trim(p_document->'project'->>'name'), p_document->'project'->>'description');
    for epic in select value from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb)) loop
        epic_id := gen_random_uuid();
        epic_map := epic_map || jsonb_build_object(epic->>'ref', epic_id::text);
        insert into public.epics(id, project_id, title, description, priority, tags)
        values (epic_id, project_id, trim(epic->>'title'), epic->>'description', coalesce(epic->>'priority', 'medium'),
            coalesce(array(select jsonb_array_elements_text(epic->'tags')), '{}'::text[]));
        reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', epic->>'ref', 'generated_id', epic_id));
    end loop;
    for feature in select value from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) loop
        feature_id := gen_random_uuid();
        feature_map := feature_map || jsonb_build_object(feature->>'ref', feature_id::text);
        insert into public.features(
            id, project_id, epic_id, title, description, goal, priority, status, kind,
            bug_severity, steps_to_reproduce, expected_result, actual_result, tags, notes
        ) values (
            feature_id, project_id,
            nullif(epic_map->>(feature->>'epic_ref'), '')::uuid,
            trim(feature->>'title'), feature->>'description', feature->>'goal',
            coalesce(feature->>'priority', 'medium'), coalesce(feature->>'status', 'backlog'),
            case when feature->>'kind' = 'feature' then 'story' else coalesce(feature->>'kind', 'story') end, feature->>'bug_severity',
            feature->>'steps_to_reproduce', feature->>'expected_result', feature->>'actual_result',
            coalesce(array(select jsonb_array_elements_text(feature->'tags')), '{}'::text[]), feature->>'notes'
        );
        reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', feature->>'ref', 'generated_id', feature_id));
        for task in select value from jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) loop
            insert into public.tasks(feature_id, title, description, status, position)
            values (feature_id, trim(task->>'title'), task->>'description', coalesce(task->>'status', 'todo'), coalesce((task->>'position')::integer, 0));
        end loop;
        for criterion in select value from jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) loop
            insert into public.acceptance_criteria(feature_id, description, satisfied, position)
            values (feature_id, trim(criterion->>'description'), coalesce((criterion->>'satisfied')::boolean, false), coalesce((criterion->>'position')::integer, 0));
        end loop;
    end loop;
    for dependency in select value from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) loop
        perform public.forge_create_dependency(
            project_id,
            (feature_map->>(dependency->>'blocking_feature_ref'))::uuid,
            (feature_map->>(dependency->>'blocked_feature_ref'))::uuid
        );
    end loop;
    return jsonb_build_object(
        'schema_version', preview->>'schema_version', 'workspace_id', p_workspace_id,
        'project_id', project_id, 'fingerprint', preview->>'fingerprint',
        'references', reference_rows, 'counts', preview->'counts'
    );
end;
$$;

create or replace function public.forge_delete_imported_project(
    p_workspace_id uuid, p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if public.forge_workspace_role(p_workspace_id) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    delete from public.projects where id = p_project_id and workspace_id = p_workspace_id;
end;
$$;

create or replace function public.forge_transfer_export(
    p_workspace_id uuid, p_project_id uuid, p_schema_version text default 'forge-project-import-v1'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    project_row public.projects;
    document jsonb;
    epics jsonb := '[]'::jsonb;
    features jsonb := '[]'::jsonb;
    dependencies jsonb := '[]'::jsonb;
    epic_map jsonb := '{}'::jsonb;
    feature_map jsonb := '{}'::jsonb;
    item jsonb;
    row_record record;
    index_value integer := 0;
    feature_index integer;
    task_json jsonb;
    criterion_json jsonb;
begin
    if public.forge_workspace_role(p_workspace_id) is null then
        raise exception 'workspace membership required' using errcode = '42501';
    end if;
    select * into project_row from public.projects where id = p_project_id and workspace_id = p_workspace_id;
    if not found then raise exception 'project not found'; end if;
    for row_record in select * from public.epics where project_id = p_project_id order by created_at, id loop
        index_value := index_value + 1;
        epic_map := epic_map || jsonb_build_object(row_record.id::text, format('epic:%s', lpad(index_value::text, 3, '0')));
        epics := epics || jsonb_build_array(jsonb_build_object(
            'ref', format('epic:%s', lpad(index_value::text, 3, '0')), 'title', row_record.title,
            'description', row_record.description,
            'priority', row_record.priority, 'tags', to_jsonb(row_record.tags)
        ) - case when p_schema_version = 'forge-project-import-v1' then array['priority','tags'] else array[]::text[] end);
    end loop;
    index_value := 0;
    for row_record in select * from public.features where project_id = p_project_id order by created_at, id loop
        index_value := index_value + 1;
        feature_map := feature_map || jsonb_build_object(row_record.id::text, format('feature:%s', lpad(index_value::text, 3, '0')));
        task_json := coalesce((select jsonb_agg(jsonb_build_object(
            'ref', format('task:%s', lpad(task_number::text, 3, '0')), 'title', task_row.title,
            'description', task_row.description, 'status', task_row.status, 'position', task_row.position
        ) order by task_row.position, task_row.id)
        from (select tasks.*, row_number() over (order by position, id) task_number from public.tasks where feature_id = row_record.id) task_row), '[]'::jsonb);
        criterion_json := coalesce((select jsonb_agg(jsonb_build_object(
            'ref', format('criterion:%s', lpad(criterion_number::text, 3, '0')), 'description', criterion_row.description,
            'satisfied', criterion_row.satisfied, 'position', criterion_row.position
        ) order by criterion_row.position, criterion_row.id)
        from (select acceptance_criteria.*, row_number() over (order by position, id) criterion_number from public.acceptance_criteria where feature_id = row_record.id) criterion_row), '[]'::jsonb);
        item := jsonb_build_object(
            'ref', feature_map->>row_record.id::text, 'title', row_record.title, 'description', row_record.description,
            'goal', row_record.goal, 'priority', row_record.priority, 'status', row_record.status,
            'epic_ref', epic_map->>row_record.epic_id::text, 'tasks', task_json, 'acceptance_criteria', criterion_json,
            'kind', row_record.kind, 'bug_severity', row_record.bug_severity,
            'steps_to_reproduce', row_record.steps_to_reproduce, 'expected_result', row_record.expected_result,
            'actual_result', row_record.actual_result, 'notes', row_record.notes, 'tags', to_jsonb(row_record.tags)
        );
        if p_schema_version = 'forge-project-import-v1' then
            item := item - array['kind','bug_severity','steps_to_reproduce','expected_result','actual_result','notes','tags'];
        end if;
        features := features || jsonb_build_array(item);
    end loop;
    for row_record in select * from public.feature_dependencies where project_id = p_project_id order by created_at, id loop
        dependencies := dependencies || jsonb_build_array(jsonb_build_object(
            'blocking_feature_ref', feature_map->>row_record.blocking_feature_id::text,
            'blocked_feature_ref', feature_map->>row_record.blocked_feature_id::text
        ));
    end loop;
    document := jsonb_build_object(
        'schema_version', p_schema_version,
        'project', jsonb_build_object('name', project_row.name, 'description', project_row.description),
        'epics', epics, 'features', features, 'dependencies', dependencies
    );
    return document;
end;
$$;

create or replace function public.forge_transfer_contextual_preview(
    p_workspace_id uuid, p_project_id uuid, p_scope text, p_destination_id uuid, p_document jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    preview jsonb;
begin
    if public.forge_project_role(p_project_id) is null then
        raise exception 'project membership required' using errcode = '42501';
    end if;
    if p_scope = 'epics' then
        if p_destination_id <> p_project_id and not exists (select 1 from public.epics where id = p_destination_id and project_id = p_project_id) then
            raise exception 'destination Epic not found in this project';
        end if;
    elsif p_scope = 'work-items' then
        if not exists (select 1 from public.epics where id = p_destination_id and project_id = p_project_id) then
            raise exception 'destination Epic not found in this project';
        end if;
    elsif p_scope = 'tasks' then
        if not exists (select 1 from public.features where id = p_destination_id and project_id = p_project_id) then
            raise exception 'destination Work Item not found in this project';
        end if;
    else
        raise exception 'unsupported contextual transfer scope' using errcode = '22023';
    end if;
    preview := public.forge_transfer_preview(p_workspace_id, p_document);
    if p_scope = 'epics' and jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) <> 1 then
        raise exception 'Epic transfer must contain exactly one Epic' using errcode = '22023';
    end if;
    if p_scope = 'work-items' and (jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) <> 0 or jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)) = 0) then
        raise exception 'Work Item transfer must contain Work Items and no Epics' using errcode = '22023';
    end if;
    if p_scope = 'tasks' and (jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) <> 0 or jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)) <> 1) then
        raise exception 'Task transfer must contain one Work Item and no Epics' using errcode = '22023';
    end if;
    if p_scope = 'tasks' and (
        jsonb_array_length(coalesce((p_document->'features'->0)->'tasks', '[]'::jsonb)) = 0
        or jsonb_array_length(coalesce((p_document->'features'->0)->'acceptance_criteria', '[]'::jsonb)) <> 0
    ) then
        raise exception 'Task transfer must contain Tasks for exactly one Work Item' using errcode = '22023';
    end if;
    return preview || jsonb_build_object('destination', jsonb_build_object('scope', p_scope, 'id', p_destination_id));
end;
$$;

create or replace function public.forge_transfer_contextual_commit(
    p_workspace_id uuid, p_project_id uuid, p_scope text, p_destination_id uuid,
    p_document jsonb, p_expected_fingerprint text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    preview jsonb;
    epic jsonb;
    feature jsonb;
    task jsonb;
    criterion jsonb;
    dependency jsonb;
    new_epic_id uuid;
    new_feature_id uuid;
    target_epic_id uuid;
    target_feature_id uuid;
    epic_map jsonb := '{}'::jsonb;
    feature_map jsonb := '{}'::jsonb;
    reference_rows jsonb := '[]'::jsonb;
begin
    if public.forge_project_role(p_project_id) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    preview := public.forge_transfer_contextual_preview(p_workspace_id, p_project_id, p_scope, p_destination_id, p_document);
    if preview->>'fingerprint' <> p_expected_fingerprint then
        raise exception 'import fingerprint does not match the reviewed destination and document' using errcode = '40001';
    end if;
    if p_scope = 'epics' then
        target_epic_id := p_destination_id;
        for epic in select value from jsonb_array_elements(p_document->'epics') loop
            new_epic_id := gen_random_uuid();
            target_epic_id := new_epic_id;
            epic_map := epic_map || jsonb_build_object(epic->>'ref', new_epic_id::text);
            insert into public.epics(id, project_id, title, description, priority, tags)
            values (new_epic_id, p_project_id, trim(epic->>'title'), epic->>'description', coalesce(epic->>'priority', 'medium'), coalesce(array(select jsonb_array_elements_text(epic->'tags')), '{}'::text[]));
            reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', epic->>'ref', 'generated_id', new_epic_id));
        end loop;
    elsif p_scope = 'work-items' then
        target_epic_id := p_destination_id;
    end if;
    if p_scope in ('epics', 'work-items') then
        for feature in select value from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) loop
            new_feature_id := gen_random_uuid();
            feature_map := feature_map || jsonb_build_object(feature->>'ref', new_feature_id::text);
            insert into public.features(
                id, project_id, epic_id, title, description, goal, priority, status, kind,
                bug_severity, steps_to_reproduce, expected_result, actual_result, tags, notes
            ) values (
                new_feature_id, p_project_id, target_epic_id, trim(feature->>'title'), feature->>'description', feature->>'goal',
                coalesce(feature->>'priority', 'medium'), coalesce(feature->>'status', 'backlog'), case when feature->>'kind' = 'feature' then 'story' else coalesce(feature->>'kind', 'story') end,
                feature->>'bug_severity', feature->>'steps_to_reproduce', feature->>'expected_result', feature->>'actual_result',
                coalesce(array(select jsonb_array_elements_text(feature->'tags')), '{}'::text[]), feature->>'notes'
            );
            reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', feature->>'ref', 'generated_id', new_feature_id));
            for task in select value from jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) loop
                insert into public.tasks(feature_id, title, description, status, position)
                values (new_feature_id, trim(task->>'title'), task->>'description', coalesce(task->>'status', 'todo'), coalesce((task->>'position')::integer, 0));
            end loop;
            for criterion in select value from jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) loop
                insert into public.acceptance_criteria(feature_id, description, satisfied, position)
                values (new_feature_id, trim(criterion->>'description'), coalesce((criterion->>'satisfied')::boolean, false), coalesce((criterion->>'position')::integer, 0));
            end loop;
        end loop;
    else
        target_feature_id := p_destination_id;
        for task in select value from jsonb_array_elements(coalesce((p_document->'features'->0)->'tasks', '[]'::jsonb)) loop
            insert into public.tasks(feature_id, title, description, status, position)
            values (target_feature_id, trim(task->>'title'), task->>'description', coalesce(task->>'status', 'todo'), coalesce((task->>'position')::integer, 0));
        end loop;
    end if;
    for dependency in select value from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) loop
        perform public.forge_create_dependency(
            p_project_id,
            coalesce((feature_map->>(dependency->>'blocking_feature_ref'))::uuid, null),
            coalesce((feature_map->>(dependency->>'blocked_feature_ref'))::uuid, null)
        );
    end loop;
    return jsonb_build_object(
        'schema_version', preview->>'schema_version', 'workspace_id', p_workspace_id,
        'project_id', p_project_id, 'fingerprint', preview->>'fingerprint',
        'references', reference_rows, 'counts', preview->'counts'
    );
end;
$$;

create or replace function public.forge_transfer_contextual_export(
    p_workspace_id uuid, p_project_id uuid, p_scope text, p_destination_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    document jsonb := public.forge_transfer_export(p_workspace_id, p_project_id, 'forge-project-transfer-v2');
    target_ref text;
    selected_features jsonb;
    selected_epics jsonb;
begin
    if public.forge_project_role(p_project_id) is null then
        raise exception 'project membership required' using errcode = '42501';
    end if;
    if p_scope = 'epics' then
        select format('epic:%s', lpad(position::text, 3, '0')) into target_ref
        from (select id, row_number() over (order by created_at, id) as position from public.epics where project_id = p_project_id) item
        where id = p_destination_id;
        if target_ref is null then raise exception 'Epic not found in this project'; end if;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_epics from jsonb_array_elements(document->'epics') where value->>'ref' = target_ref;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_features from jsonb_array_elements(document->'features') where value->>'epic_ref' = target_ref;
        document := jsonb_set(jsonb_set(document, '{epics}', selected_epics), '{features}', selected_features);
    elsif p_scope = 'work-items' then
        select format('epic:%s', lpad(position::text, 3, '0')) into target_ref
        from (select id, row_number() over (order by created_at, id) as position from public.epics where project_id = p_project_id) item
        where id = p_destination_id;
        if target_ref is null then raise exception 'Epic not found in this project'; end if;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_features from jsonb_array_elements(document->'features') where value->>'epic_ref' = target_ref;
        document := jsonb_set(jsonb_set(document, '{epics}', '[]'::jsonb), '{features}', selected_features);
    elsif p_scope = 'tasks' then
        select format('feature:%s', lpad(position::text, 3, '0')) into target_ref
        from (select id, row_number() over (order by created_at, id) as position from public.features where project_id = p_project_id) item
        where id = p_destination_id;
        if target_ref is null then raise exception 'Work Item not found in this project'; end if;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_features from jsonb_array_elements(document->'features') where value->>'ref' = target_ref;
        selected_features := jsonb_set(selected_features, '{0,acceptance_criteria}', '[]'::jsonb);
        document := jsonb_set(jsonb_set(document, '{epics}', '[]'::jsonb), '{features}', selected_features);
    else
        raise exception 'unsupported contextual transfer scope' using errcode = '22023';
    end if;
    return document;
end;
$$;

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
    select schema_version into installed_version from public.forge_schema_meta
    where schema_version = 'forge-byoc-v2';
    if installed_version is null then
        raise exception 'unsupported FORGE BYOC schema' using errcode = '42P01';
    end if;
    return jsonb_build_object('schema_version', installed_version);
end;
$$;

insert into public.forge_schema_meta(schema_version)
values ('forge-byoc-v2') on conflict (schema_version) do nothing;

revoke all on public.tasks, public.acceptance_criteria, public.feature_dependencies, public.bug_attachments from anon, authenticated;
grant select, insert, update, delete on public.tasks, public.acceptance_criteria, public.feature_dependencies, public.bug_attachments to authenticated;
grant execute on function public.forge_workspace_role(uuid), public.forge_project_role(uuid) to authenticated;
grant execute on function public.forge_bug_attachment_scope(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.forge_project_is_active(uuid) to authenticated;
grant execute on function public.forge_reorder_tasks(uuid, uuid[]), public.forge_reorder_criteria(uuid, uuid[]) to authenticated;
grant execute on function public.forge_create_dependency(uuid, uuid, uuid) to authenticated;
grant execute on function public.forge_owner_add_member(uuid, uuid, text) to authenticated;
grant execute on function public.forge_transfer_preview(uuid, jsonb), public.forge_transfer_commit(uuid, jsonb, text) to authenticated;
grant execute on function public.forge_delete_imported_project(uuid, uuid) to authenticated;
grant execute on function public.forge_transfer_export(uuid, uuid, text) to authenticated;
grant execute on function public.forge_transfer_contextual_preview(uuid, uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.forge_transfer_contextual_commit(uuid, uuid, text, uuid, jsonb, text) to authenticated;
grant execute on function public.forge_transfer_contextual_export(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.forge_storage_preflight() to authenticated;
revoke execute on function public.forge_storage_preflight() from anon, public;
revoke execute on function public.forge_bug_attachment_scope(uuid, uuid, uuid, boolean) from anon, public;
revoke execute on function public.forge_project_is_active(uuid) from anon, public;

commit;
