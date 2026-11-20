# Today: the default landing page

Status: implemented. It is the first screen the application opens (`/`).

## Why it exists

A planning tool that asks for a workspace, a project and an epic before the first task is
abandoned in minutes. Today is the opposite entry point: one line to capture a task, one list of
what is due. The structure (workspace, project, epic, criteria, bugs) is still there and a task
can grow into it, but nothing about it is required to start.

## Behaviour

- **First use.** When no workspace exists, Today creates a `Personal` workspace and an `Inbox`
  project through the API, so the durable state stays backend-owned. When they already exist
  nothing is created. If every workspace is archived, Today says so instead of creating another.
- **Quick capture.** One field, Enter to save. The task is a work item in the `Inbox` project
  (or the first project when there is no `Inbox`). Pressing `n` outside a text field focuses it.
- **Natural dates.** A trailing date phrase becomes the due date and is removed from the title,
  in English or Spanish: `today`, `tomorrow`, `friday`, `next monday`, `in 3 days`,
  `in 2 weeks`, `next week`, `2026-12-24`, and `hoy`, `mañana`, `el viernes`, `en 3 días`,
  `próxima semana`. A weekday at the start of a line is treated as part of the title, a line that
  is only a date phrase is a title, and an impossible date is ignored. The live preview shows what
  will be saved before Enter.
- **The list.** Open work across every active project of the active workspace, grouped as
  Overdue, Today, Next 7 days, Later and No date, ordered by date, then priority, then age.
  Finished work is hidden.
- **Low maintenance.** Complete with the checkbox (with Undo), change or clear the date inline,
  move one overdue task or all of them to today with one click.
- A task opens in the normal work item page, where criteria, tasks, bug evidence and epics
  live. The Workspace Overview that used to be `/` is now `/overview`.

## Organize a captured task

Every row has an **Organize** button that opens one dialog: project, Epic, type (Story or Bug),
priority and tags. It exists so a task captured in the Inbox can reach the structure that already
exists without opening a heavy screen.

- The smallest set of calls is planned in one pure function: a move first, then the field changes.
  Nothing is sent when nothing changed.
- **Moving between projects** is its own backend operation (`POST .../features/{id}/move`, one
  transaction). It only targets an active project of the same workspace, optionally into one of
  its Epics. Tasks, criteria, tags and (locally) screenshots follow the item.
- A work item that **has dependencies is refused**, because dependencies are scoped to one project
  and silently dropping them would change the plan. The message says so.
- **Supabase** refuses a move when the item has screenshots as well: their Storage path embeds the
  project, so they would become unreachable. This guard runs in the client and is not exercised
  against a real project yet: rehearse it on a throwaway Supabase project before relying on it.
- Turning a Story into a Bug gives it a `medium` severity; turning a Bug into a Story clears it.
- If the move succeeds and a later field change fails, the dialog says the item already moved.

## Decision views

Today answers "what is due". The same page also answers the questions boards do not, as filters over
the data it already loads (no new module). Each view shows its count before it is opened and has a
link of its own (`/?view=blocked`).

| View        | Shows                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Due         | The default: overdue, today, next 7 days, later, no date                         |
| Upcoming    | Open work due after today and within 14 days, soonest first                      |
| Blocked     | Open work waiting on a dependency that is not done, naming the blocker           |
| Verify      | Open work whose status is Verify                                                 |
| Stalled     | Started work (refining, ready, in progress, verify) with no activity for 14 days |
| Unorganized | Inbox items that have no Epic, oldest first                                      |

These are planning facts from recorded data, in manual-planning language. "Stalled" means no
recorded change, not that anything is wrong.

## Data

`Feature.due_date` is an optional ISO date (`YYYY-MM-DD`, no time or timezone, so a deadline
never shifts with the viewer's clock). It exists in:

- SQLite, through migration `v0006_feature_due_date` (additive, idempotent, keeps every row);
- the API and OpenAPI contract (`FeatureCreate`, `FeatureUpdate`, `FeatureResponse`);
- the Supabase BYOC schema, through the owner-run
  [20261119_byoc_0006.sql](../../supabase/migrations/20261119_byoc_0006.sql) with a
  [rollback](../../supabase/rollback/20261119_byoc_0006.sql). Until it is applied the app works
  against that project as before, only the due date is unavailable.;
- the transfer document (schema v2): an optional `due_date` on a work item, omitted when empty
  so documents without deadlines are unchanged, and ignored in schema v1.

## Known limits

- **Transfer (Supabase).** JSON and ZIP export/import and contextual transfer carry `due_date`
  on SQLite. On Supabase they carry it once the owner has applied
  [20261119_byoc_0007.sql](../../supabase/migrations/20261119_byoc_0007.sql); before that, export and
  import drop the deadlines. See the [migration runbook](../operations/byoc-due-dates-migration.md).
- **Reminders.** One digest a day, at a time the user chooses, for what is due today or overdue.
  It is off until the user turns it on from the row under the Today heading, which also asks the
  system for notification permission and offers a test notification. It runs for the whole session
  (also while the desktop window is hidden in the tray) and never creates data. It is not
  per-task: due dates carry no time of day, so there is nothing to schedule more finely, and the
  Android shell has no notification support. The preference lives in the installation
  (`localStorage`), not in the database, so it is not shared between devices.
- **Global shortcut.** `n` works inside the app only. A system-wide capture shortcut needs a
  narrow desktop capability and is not part of this change.
