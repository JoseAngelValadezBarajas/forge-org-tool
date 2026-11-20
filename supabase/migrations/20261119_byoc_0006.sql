-- FORGE BYOC 0.3 optional due date on work items.
--
-- Owner-run migration. Never run from the installed application.
-- It adds one nullable column and an index; it does not rewrite existing rows,
-- policies or functions, so the schema stays compatible with the forge-byoc-v2
-- preflight. Apply it before using due dates against this project: until then
-- the app can still read and write everything except the due date.
--
-- Known limit: the transfer RPCs (export/import packages) do not carry due_date.

begin;

alter table public.features
    add column if not exists due_date date;

create index if not exists features_due_date_idx
    on public.features (project_id, due_date);

commit;
