-- FORGE BYOC 0.2 incremental repair for Supabase extension resolution.
--
-- Owner-run migration for an existing project. FORGE must never run this file
-- from the installed application. It changes function configuration only; it
-- does not rewrite project, workspace or attachment data.

begin;

-- Supabase commonly installs pgcrypto in the extensions schema. Keep this
-- idempotent for projects where 0001 already enabled it in another schema.
create extension if not exists pgcrypto;

alter function public.forge_transfer_preview(uuid, jsonb)
    set search_path = public, extensions;
alter function public.forge_transfer_commit(uuid, jsonb, text)
    set search_path = public, extensions;
alter function public.forge_transfer_contextual_preview(uuid, uuid, text, uuid, jsonb)
    set search_path = public, extensions;
alter function public.forge_transfer_contextual_commit(uuid, uuid, text, uuid, jsonb, text)
    set search_path = public, extensions;

commit;
