# BYOC due dates: migrations 0006 and 0007

Owner-run. FORGE never applies SQL. This page is the runbook for adding work item due dates
(used by [Today](../product/today.md)) to a Supabase project that already runs BYOC 0.2.

| Migration                                                                  | What it does                                                                                                            | Needed for                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [20261119_byoc_0006.sql](../../supabase/migrations/20261119_byoc_0006.sql) | Adds the nullable `features.due_date date` column and an index. No existing row or policy changes.                      | Saving and reading due dates                                     |
| [20261119_byoc_0007.sql](../../supabase/migrations/20261119_byoc_0007.sql) | Replaces the six transfer RPCs so JSON/ZIP export and import carry `due_date`, and adds the `forge_is_iso_date` helper. | Keeping deadlines through export, import and contextual transfer |

Apply 0006 first, then 0007. Rollbacks live in [supabase/rollback](../../supabase/rollback) and run in
the opposite order.

## What works in each state

| Supabase schema | New app behaviour                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before 0006     | Everything works except setting a date. Today lists tasks without dates. Saving a date fails with "does not support due dates yet. Apply 20261119_byoc_0006.sql". |
| 0006 only       | Dates are saved and shown. Export and import still drop them (the RPCs predate 0007).                                                                             |
| 0006 and 0007   | Complete: dates survive JSON export, ZIP export, import and contextual import. Invalid dates are rejected at preview.                                             |

## Before you start

1. Confirm the project is on BYOC 0.2: `select public.forge_storage_preflight();` returns
   `forge-byoc-v2`, and migrations 0001 to 0005 are applied.
2. Take the backup you normally take (Supabase backup or an export of `public.features`).
   0006 is additive, but the rollback of 0006 **discards every stored due date**, so keep a
   copy of `select id, due_date from public.features where due_date is not null` before rolling back.
3. Read both migrations. 0007 is long because it restates six existing functions with the same
   text as 0002 plus the due date lines. The repository tests prove that its rollback is
   identical to the 0002 definitions and that it touches no table or row.

## Rehearse on a disposable project first

The repository tests read the SQL; they do **not** run it against PostgreSQL. Run it once
somewhere you can throw away before production:

1. Create a throwaway Supabase project (or a branch) and apply 0001 to 0005.
2. Run [verify/20261119_byoc_0006_0007_verify.sql](../../supabase/verify/20261119_byoc_0006_0007_verify.sql)
   and keep the output: it shows the starting state.
3. Apply 0006, then 0007, each in the SQL editor.
4. Run the verify script again and compare with the expected values written in its comments
   (column present, index present, search paths, security modes, helper results `t f f f`,
   privileges, grants preserved).
5. Exercise it from FORGE against that project (see "Acceptance" below).
6. Apply the 0007 rollback, then the 0006 rollback, run the verify script a third time and confirm
   the project is back to its starting state.

Only then repeat steps 3 and 4 on the real project.

## Acceptance (from the installed app, on the Supabase provider)

1. Sign in, open Today, add `Pay hosting tomorrow`. It appears under Next 7 days.
2. Change its date in the row, reload, confirm the date persisted.
3. Export the project as a ZIP (Transfer page) and import the file into a second workspace.
   The imported task keeps its date; a task without a date still has none.
4. Edit a JSON export so one work item has `"due_date": "2026-02-31"` and try to import it. The
   preview must reject it with "work item due dates must be ISO dates".
5. Run the verify script once more: `with_due_date` equals the number of dated tasks you created.

## Rolling back

1. Save the dates you want to keep (see "Before you start").
2. Run [rollback/20261119_byoc_0007.sql](../../supabase/rollback/20261119_byoc_0007.sql): the six RPCs
   return to their 0002 definitions (with the 0004/0005 `search_path`) and the helper is dropped.
3. Only if you also want the column gone, run [rollback/20261119_byoc_0006.sql](../../supabase/rollback/20261119_byoc_0006.sql).
   Rolling back 0007 alone is safe and keeps the dates in the table.

## Not covered by automated checks

- Executing the SQL in PostgreSQL (only text-level contract tests exist, in
  `apps/api/tests/test_byoc_due_date_transfer_contract.py`).
- A real two-installation check against Supabase. The rehearsal and acceptance steps above are
  how to close that gap.
