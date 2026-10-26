-- Run only against the owner's BYOC project after confirming no data needs to remain.
-- This removes only objects created by 20261026_byoc_0001.sql.

drop function if exists public.forge_create_workspace(text, text);
drop function if exists public.forge_storage_preflight();
drop table if exists public.workspace_tags;
drop table if exists public.features;
drop table if exists public.epics;
drop table if exists public.projects;
drop table if exists public.workspace_members;
drop table if exists public.workspaces;
drop table if exists public.forge_schema_meta;
