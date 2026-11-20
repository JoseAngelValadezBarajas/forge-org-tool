# Project Transfer

Project Transfer supports complete-Project JSON v1/v2 import/export, contextual JSON v2 transfer, and complete-Project ZIP v2 import/export with Bug screenshots. Contextual scopes are: one Epic with its child Work Items into a Project; multiple Stories/Bugs into an existing Epic; and Tasks into an existing Work Item. UI entry points are available from Workspace, Project, Epic and Work Item contexts. The v1 adapter remains available for complete-Project imports; contextual scopes require v2.

All JSON imports use a fingerprint over the normalized document and destination. Preview and confirmation share the validated engine; destination changes and stale fingerprints are rejected. Failed imports are atomic. Contextual JSON carries references, tags, statuses, notes, Bug fields, criteria and Tasks, but not binary screenshots. ZIP screenshot packages remain complete-Project-only.

## Validation boundary

Validate format version, required fields, identifier uniqueness, workspace/project ownership, Epic/work-item/criteria/task/dependency references, dependency cycles, normalized workspace-scoped tags, state values, attachment count/type/size and fingerprint before committing. Invalid imports fail atomically with no partial writes. Never infer or import external verification, CI, release or deployment claims.

## Attachments

Only PNG, JPEG and WebP images are supported. ZIP package v2 contains a UTF-8 `manifest.json` plus screenshot entries under `attachments/feature-NNN/attachment-NNN.{png,jpg,webp}`. The manifest names each file, content type, byte size, and SHA-256. The current package bound is 5 MiB compressed, 25 MiB expanded, 100 entries, five images per Bug and 5 MiB per image. Package imports reject absolute paths, `..` traversal, symlinks, duplicate normalized paths, unsupported compression or entries, checksum mismatch, unsupported image bytes and unreferenced files. Package bytes are validated before database writes; import keeps project and attachment metadata in one SQLite transaction, publishes only generated safe storage names, and removes published files if the transaction fails. Browser-to-sidecar requests use bounded base64 JSON and remain below the Desktop 8 MiB body limit.

## Compatibility and fixtures

Maintain fixtures for valid v1 and v2 round trips; unknown versions; malformed JSON; invalid schema; duplicate identifiers; missing/cross-project references; cross-workspace tags; dependency cycles; stale fingerprints; corrupt checksums; unsupported image formats; oversize assets; traversal paths; symlink entries; and interrupted staged writes. Tests use synthetic temporary data only.

See [the product contract](../product/mvp-1.0.md) and [acceptance traceability](../quality/mvp-1.0-acceptance.md).

## Work item due dates

Schema v2 work items may carry `due_date`, an ISO calendar date (`YYYY-MM-DD`, no time or zone).
Exporters omit the key when the date is empty, so documents without deadlines are unchanged.
Importers reject anything that is not a real date and ignore the field in schema v1. The rule is
shared by SQLite, Supabase and the TypeScript client through `contracts/transfer/conformance.json`.
On Supabase the transfer RPCs need migration 0007; see
[the due dates runbook](../operations/byoc-due-dates-migration.md).

## Import from a spreadsheet or GitHub

The Transfer page accepts files from other tools and converts them, in the browser, into a normal
`forge-project-transfer-v2` document. That document then goes through the same preview, fingerprint
and confirmation as any other import, so the server validates everything and nothing is written
until the user confirms. A converted import always creates a **new project**; it is not offered for
Epic, work item or task transfers.

**CSV** (`.csv` or `.tsv`; comma, semicolon or tab, quoted fields and line breaks inside quotes).
The first row names the columns; only a title column is required. Recognized headers, English or
Spanish: title / name / summary / task, description / body, status / state, priority, type / kind,
severity, due / due date / deadline, tags / labels, epic / milestone / group. Status and priority
words are mapped (`In Progress`, `Review`, `Closed`, `P0`, `Urgent`, `alta`...); anything unknown is
imported as backlog or medium and reported. Dates must be `YYYY-MM-DD` (or `YYYY/MM/DD`); other
formats are left empty and reported rather than guessed. Rows without a title are skipped and listed.

**GitHub issues.** Export them with the GitHub CLI and choose the JSON file:

```text
gh issue list --state all --limit 1000 --json number,title,body,state,labels,milestone,url > issues.json
```

A closed issue becomes Done, a `bug` label makes it a Bug, a `priority: high` (or `P1`, `critical`)
label sets the priority, other labels become tags, each milestone becomes an Epic and its due date
becomes the deadline of its issues, and pull requests are skipped. The issue number and link are
kept in the notes. Nothing is fetched from GitHub: only the file you choose is read.

**Limits and honesty.** A project import takes at most 500 items and 100 Epics. Titles over 200
characters and descriptions over 4000 are shortened and reported. A summary shows how many items and
Epics will be created, what was skipped and every adjustment before the user confirms.
