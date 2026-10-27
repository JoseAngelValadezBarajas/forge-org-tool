-- FORGE BYOC 0.2 incremental workspace management.
--
-- Owner action only: review a backup and run this file in the owner's
-- Supabase SQL editor or controlled CLI workflow. Never run this from the installed application.
-- This migration does not change 0001 or 0002 and
-- remains compatible with the forge-byoc-v2 preflight.

begin;

create or replace function public.forge_delete_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'authentication required' using errcode = '42501';
    end if;

    if not exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = p_workspace_id
          and wm.user_id = auth.uid()
          and wm.role = 'owner'
    ) then
        raise exception 'workspace owner access required' using errcode = '42501';
    end if;

    -- Remove private attachment objects before the metadata cascades from the
    -- workspace delete. The bucket remains owned by the BYOC project.
    delete from storage.objects
    where bucket_id = 'forge-bug-attachments'
      and name like p_workspace_id::text || '/%';

    delete from public.workspaces
    where id = p_workspace_id;

    if not found then
        raise exception 'workspace not found' using errcode = 'P0002';
    end if;
end;
$$;

revoke execute on function public.forge_delete_workspace(uuid) from anon, public;
grant execute on function public.forge_delete_workspace(uuid) to authenticated;

commit;
