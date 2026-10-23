# Project Transfer

Project Transfer currently supports complete-Project JSON v1/v2 import/export and complete-Project ZIP v2 import/export with Bug screenshots. JSON imports use a fingerprint over the normalized document. Preview and confirmation call the same validation engine, and stale fingerprints are rejected. Contextual Epic, Work Item and Task import/export is a required 1.0 capability but is not implemented yet; do not interpret the complete-Project flows as satisfying it.

## Validation boundary

Validate format version, required fields, identifier uniqueness, workspace/project ownership, Epic/work-item/criteria/task/dependency references, dependency cycles, normalized workspace-scoped tags, state values, attachment count/type/size and fingerprint before committing. Invalid imports fail atomically with no partial writes. Never infer or import external verification, CI, release or deployment claims.

## Attachments

Only PNG, JPEG and WebP images are supported. ZIP package v2 contains a UTF-8 `manifest.json` plus screenshot entries under `attachments/feature-NNN/attachment-NNN.{png,jpg,webp}`. The manifest names each file, content type, byte size, and SHA-256. The current package bound is 5 MiB compressed, 25 MiB expanded, 100 entries, five images per Bug and 5 MiB per image. Package imports reject absolute paths, `..` traversal, symlinks, duplicate normalized paths, unsupported compression or entries, checksum mismatch, unsupported image bytes and unreferenced files. Package bytes are validated before database writes; import keeps project and attachment metadata in one SQLite transaction, publishes only generated safe storage names, and removes published files if the transaction fails. Browser-to-sidecar requests use bounded base64 JSON and remain below the Desktop 8 MiB body limit.

## Compatibility and fixtures

Maintain fixtures for valid v1 and v2 round trips; unknown versions; malformed JSON; invalid schema; duplicate identifiers; missing/cross-project references; cross-workspace tags; dependency cycles; stale fingerprints; corrupt checksums; unsupported image formats; oversize assets; traversal paths; symlink entries; and interrupted staged writes. Tests use synthetic temporary data only.

See [the product contract](../product/mvp-1.0.md) and [acceptance traceability](../quality/mvp-1.0-acceptance.md).
