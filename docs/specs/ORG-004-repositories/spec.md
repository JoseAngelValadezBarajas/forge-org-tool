# ORG-004 Repositories and context packages

Repositories are optional, local, and read-only observations. A connection is
allowed only beneath `FORGE_ALLOWED_REPOSITORY_ROOTS`, resolves to a Git work
tree, and never reads source content or contacts remotes. Observations append
metadata such as HEAD, branch, dirty counts, and unborn state.

Feature context packages use schema `forge-context-v1`, contain planning data
and metadata-only observations, are fingerprinted canonically, and are
immutable/deduplicated by feature, schema, and fingerprint.
