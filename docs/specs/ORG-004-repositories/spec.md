# ORG-004 Repositories and context packages

> **Status: retired from the active product (MVP 1.0).** Kept as a historical record. The code was removed; legacy SQLite tables are preserved by migrations only. See [`docs/product/mvp-1.0.md`](../../product/mvp-1.0.md).

Repositories are optional, local, and read-only observations. A connection is
allowed only beneath `FORGE_ALLOWED_REPOSITORY_ROOTS`, resolves to a Git work
tree, and never reads source content or contacts remotes. Observations append
metadata such as HEAD, branch, dirty counts, and unborn state.

Feature context packages use schema `forge-context-v1`, contain planning data
and metadata-only observations, are fingerprinted canonically, and are
immutable/deduplicated by feature, schema, and fingerprint.
Saved packages can be retrieved and downloaded as JSON or Markdown. Feature
repository links can be listed and removed without deleting repository or
observation history.
