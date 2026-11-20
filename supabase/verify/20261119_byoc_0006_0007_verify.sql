-- Read-only verification for BYOC migrations 0006 (features.due_date) and 0007 (transfer RPCs).
-- Owner-run, in the Supabase SQL editor. It changes nothing: every statement is a SELECT.
-- Run it before (to see the starting state) and after applying 0006 and 0007.

-- 1. 0006: the column exists, is a nullable date, and has its index.
--    Expected after 0006: one row  due_date | date | YES
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'features' and column_name = 'due_date';

--    Expected after 0006: one row  features_due_date_idx
select indexname
from pg_indexes
where schemaname = 'public' and indexname = 'features_due_date_idx';

-- 2. 0007: the six transfer RPCs and the helper exist, keep their security mode, and keep
--    their search_path. Expected search_path after 0007:
--      preview/commit/contextual_preview/contextual_commit -> {"search_path=pg_catalog, extensions, public"}
--      export/contextual_export                            -> {search_path=public}
--      forge_is_iso_date                                   -> {search_path=pg_catalog}
--    Expected security: commit RPCs are definers (true), everything else invokers (false).
select p.proname as function_name, p.prosecdef as security_definer, p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'forge_transfer_preview', 'forge_transfer_commit', 'forge_transfer_export',
      'forge_transfer_contextual_preview', 'forge_transfer_contextual_commit',
      'forge_transfer_contextual_export', 'forge_is_iso_date'
  )
order by p.proname;

-- 3. 0007: whether the transfer RPCs already know about due dates (true after 0007).
select p.proname as function_name,
       position('due_date' in pg_get_functiondef(p.oid)) > 0 as mentions_due_date
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'forge_transfer_preview', 'forge_transfer_commit', 'forge_transfer_export',
      'forge_transfer_contextual_commit'
  )
order by p.proname;

-- 4. 0007: the date helper. Expected: true | false | false | false
select public.forge_is_iso_date('2026-12-01') as valid_date,
       public.forge_is_iso_date('2026-02-31') as impossible_date,
       public.forge_is_iso_date('tomorrow') as word,
       public.forge_is_iso_date('2026-12-01T00:00:00') as timestamp_value;

-- 5. 0007: privileges. Expected: true | false
select has_function_privilege('authenticated', 'public.forge_is_iso_date(text)', 'execute') as authenticated_can_execute,
       has_function_privilege('anon', 'public.forge_is_iso_date(text)', 'execute') as anon_can_execute;

-- 6. Existing grants on the replaced RPCs survived. Expected: true on every row.
select p.proname as function_name,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'forge_transfer_preview', 'forge_transfer_commit', 'forge_transfer_export',
      'forge_transfer_contextual_preview', 'forge_transfer_contextual_commit',
      'forge_transfer_contextual_export'
  )
order by p.proname;

-- 7. Data: how many work items carry a due date now (0 right after 0006).
select count(*) as work_items, count(due_date) as with_due_date
from public.features;
