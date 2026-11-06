-- FORGE BYOC 0.2 hardening of the search_path set by 0004.
--
-- Owner-run migration. Never run from the installed application.
-- It changes function configuration only; it does not rewrite project,
-- workspace or attachment data.
--
-- 0004 used "public, extensions". These RPCs are SECURITY DEFINER, so a
-- user-writable schema must not be searched before trusted ones. Resolve
-- pg_catalog first, then the extensions schema, and only then public.

begin;

alter function public.forge_transfer_preview(uuid, jsonb)
    set search_path = pg_catalog, extensions, public;
alter function public.forge_transfer_commit(uuid, jsonb, text)
    set search_path = pg_catalog, extensions, public;
alter function public.forge_transfer_contextual_preview(uuid, uuid, text, uuid, jsonb)
    set search_path = pg_catalog, extensions, public;
alter function public.forge_transfer_contextual_commit(uuid, uuid, text, uuid, jsonb, text)
    set search_path = pg_catalog, extensions, public;

commit;
