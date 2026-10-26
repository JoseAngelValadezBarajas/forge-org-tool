-- FORGE BYOC 0.1. Owner-run migration for a disposable or user-owned
-- Supabase project. FORGE never executes this file from an installed client.

create extension if not exists pgcrypto;

create table if not exists public.forge_schema_meta (
    schema_version text primary key,
    applied_at timestamptz not null default now()
);

insert into public.forge_schema_meta (schema_version)
values ('forge-byoc-v1')
on conflict (schema_version) do nothing;

create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) between 1 and 120),
    description text check (description is null or length(description) <= 2000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz
);

create table if not exists public.workspace_members (
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'editor', 'viewer')),
    created_at timestamptz not null default now(),
    primary key (workspace_id, user_id)
);

create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null check (length(trim(name)) between 1 and 120),
    description text check (description is null or length(description) <= 2000),
    status text not null default 'active' check (status in ('active', 'archived')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz
);

create table if not exists public.epics (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    title text not null check (length(trim(title)) between 1 and 200),
    description text check (description is null or length(description) <= 4000),
    status text not null default 'backlog' check (status in ('backlog', 'ready', 'in_progress', 'verify', 'done')),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    tags text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz,
    unique (project_id, id)
);

create table if not exists public.features (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    epic_id uuid references public.epics(id) on delete set null,
    title text not null check (length(trim(title)) between 1 and 200),
    description text check (description is null or length(description) <= 4000),
    goal text check (goal is null or length(goal) <= 4000),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    status text not null default 'backlog' check (status in ('backlog', 'refining', 'ready', 'in_progress', 'verify', 'done')),
    kind text not null default 'story' check (kind in ('story', 'bug')),
    bug_severity text check (bug_severity is null or bug_severity in ('low', 'medium', 'high', 'critical')),
    steps_to_reproduce text,
    expected_result text,
    actual_result text,
    tags text[] not null default '{}',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz,
    check (kind = 'bug' or bug_severity is null),
    constraint features_epic_same_project_fk
        foreign key (project_id, epic_id) references public.epics (project_id, id)
);

create table if not exists public.workspace_tags (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    name text not null check (length(trim(name)) between 1 and 40),
    color text not null default '#6b7280' check (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at timestamptz not null default now()
);

create unique index if not exists workspaces_active_name_key
    on public.workspaces (lower(name)) where archived_at is null;
create unique index if not exists projects_active_workspace_name_key
    on public.projects (workspace_id, lower(name)) where archived_at is null;
create unique index if not exists workspace_tags_name_key
    on public.workspace_tags (workspace_id, lower(name));
create index if not exists workspace_members_user_workspace_idx
    on public.workspace_members (user_id, workspace_id);
create index if not exists projects_workspace_idx on public.projects (workspace_id, created_at);
create index if not exists epics_project_idx on public.epics (project_id, status, created_at);
create index if not exists features_project_idx on public.features (project_id, status, created_at);
create index if not exists features_epic_idx on public.features (epic_id, status, created_at);

alter table public.forge_schema_meta enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.epics enable row level security;
alter table public.features enable row level security;
alter table public.workspace_tags enable row level security;

drop policy if exists forge_schema_meta_select_authenticated on public.forge_schema_meta;
create policy forge_schema_meta_select_authenticated on public.forge_schema_meta
    for select to authenticated using (true);

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
    for select to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.workspaces.id and wm.user_id = auth.uid()
        )
    );

drop policy if exists workspaces_update_editor on public.workspaces;
create policy workspaces_update_editor on public.workspaces
    for update to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.workspaces.id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'editor')
        )
    );

drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member on public.workspace_members
    for select to authenticated using (user_id = auth.uid());

drop policy if exists projects_select_member on public.projects;
create policy projects_select_member on public.projects
    for select to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.projects.workspace_id and wm.user_id = auth.uid()
        )
    );

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

drop policy if exists epics_select_member on public.epics;
create policy epics_select_member on public.epics
    for select to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.epics.project_id and wm.user_id = auth.uid()
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

drop policy if exists features_select_member on public.features;
create policy features_select_member on public.features
    for select to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            join public.projects p on p.workspace_id = wm.workspace_id
            where p.id = public.features.project_id and wm.user_id = auth.uid()
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

drop policy if exists workspace_tags_select_member on public.workspace_tags;
create policy workspace_tags_select_member on public.workspace_tags
    for select to authenticated using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = public.workspace_tags.workspace_id and wm.user_id = auth.uid()
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

create or replace function public.forge_create_workspace(
    p_name text,
    p_description text default null
)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
    created_workspace public.workspaces;
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception 'authentication required' using errcode = '28000';
    end if;
    insert into public.workspaces (name, description)
    values (trim(p_name), p_description)
    returning * into created_workspace;
    insert into public.workspace_members (workspace_id, user_id, role)
    values (created_workspace.id, current_user_id, 'owner');
    return created_workspace;
end;
$$;

revoke all on public.forge_schema_meta from anon, authenticated;
revoke all on public.workspaces from anon, authenticated;
revoke all on public.workspace_members from anon, authenticated;
revoke all on public.projects from anon, authenticated;
revoke all on public.epics from anon, authenticated;
revoke all on public.features from anon, authenticated;
revoke all on public.workspace_tags from anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.forge_schema_meta to authenticated;
grant select on public.workspaces, public.workspace_members, public.projects, public.epics, public.features, public.workspace_tags to authenticated;
grant update on public.workspaces, public.projects, public.epics, public.features, public.workspace_tags to authenticated;
grant insert on public.projects, public.epics, public.features, public.workspace_tags to authenticated;
grant delete on public.workspace_tags to authenticated;
grant execute on function public.forge_storage_preflight() to authenticated;
grant execute on function public.forge_create_workspace(text, text) to authenticated;

revoke execute on function public.forge_storage_preflight() from anon, public;
revoke execute on function public.forge_create_workspace(text, text) from anon, public;
