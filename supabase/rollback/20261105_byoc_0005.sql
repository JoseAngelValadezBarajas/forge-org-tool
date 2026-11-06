-- Owner-run rollback for the BYOC 0.2 search_path hardening. Do not run from FORGE.
-- Restores the state left by migration 0004.

begin;

alter function public.forge_transfer_preview(uuid, jsonb)
    set search_path = public, extensions;
alter function public.forge_transfer_commit(uuid, jsonb, text)
    set search_path = public, extensions;
alter function public.forge_transfer_contextual_preview(uuid, uuid, text, uuid, jsonb)
    set search_path = public, extensions;
alter function public.forge_transfer_contextual_commit(uuid, uuid, text, uuid, jsonb, text)
    set search_path = public, extensions;

commit;
