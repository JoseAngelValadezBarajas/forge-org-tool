-- Owner-run rollback for the BYOC 0.3 work item due date. Do not run from FORGE.
-- Dropping the column discards every stored due date.

begin;

drop index if exists public.features_due_date_idx;

alter table public.features
    drop column if exists due_date;

commit;
