-- Owner-run rollback for the BYOC 0.2 pgcrypto search-path repair.
-- Do not run from FORGE.

begin;

alter function public.forge_transfer_preview(uuid, jsonb)
    set search_path = public;
alter function public.forge_transfer_commit(uuid, jsonb, text)
    set search_path = public;
alter function public.forge_transfer_contextual_preview(uuid, uuid, text, uuid, jsonb)
    set search_path = public;
alter function public.forge_transfer_contextual_commit(uuid, uuid, text, uuid, jsonb, text)
    set search_path = public;

commit;
