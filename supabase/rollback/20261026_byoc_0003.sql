-- Owner-run rollback for BYOC workspace management. Do not run from FORGE.
begin;

revoke execute on function public.forge_delete_workspace(uuid) from authenticated;
drop function if exists public.forge_delete_workspace(uuid);

commit;
