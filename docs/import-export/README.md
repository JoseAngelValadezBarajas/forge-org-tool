# Project Transfer

Project Transfer is a supported 1.0 capability. JSON v2 is the current format; v1 remains import-compatible. Preview and confirmation must call the same validation engine, with a fingerprint over the normalized payload and an explicit stale-preview rejection.

## Validation boundary

Validate format version, required fields, identifier uniqueness, workspace/project ownership, Epic/work-item/criteria/task/dependency references, dependency cycles, normalized workspace-scoped tags, state values, attachment count/type/size and fingerprint before committing. Invalid imports fail atomically with no partial writes. Never infer or import external verification, CI, release or deployment claims.

## Attachments

Only PNG, JPEG and WebP images are supported. ZIP imports must reject absolute paths, `..` traversal, symlinks, duplicate normalized paths, unsupported compression or entries, checksum mismatch, excessive entry count, and compressed or expanded payloads above configured limits. Files are written to a private staging directory, scanned/validated, then atomically moved into the application data area. Desktop request bodies must remain within the 8 MiB host limit; larger binary assets travel through bounded attachment APIs rather than unbounded IPC payloads.

## Compatibility and fixtures

Maintain fixtures for valid v1 and v2 round trips; unknown versions; malformed JSON; invalid schema; duplicate identifiers; missing/cross-project references; cross-workspace tags; dependency cycles; stale fingerprints; corrupt checksums; unsupported image formats; oversize assets; traversal paths; symlink entries; and interrupted staged writes. Tests use synthetic temporary data only.

See [the product contract](../product/mvp-1.0.md) and [acceptance traceability](../quality/mvp-1.0-acceptance.md).
